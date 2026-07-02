# Unified AI Trading Enhancement Roadmap

This roadmap extends the existing Signal Scribe Automaton in place. Every item builds on current tables, edge functions, and services — nothing is rewritten from scratch and existing behavior stays working after each phase.

Because the scope is enormous (~20 major subsystems), I'm proposing 6 sequential phases. Each phase ends in a shippable, testable state. I'll pause for your go-ahead between phases so you can validate on live data before I move on.

---

## Phase 1 — Foundations: Workspaces, Signal Hub, Explainability schema

Goal: Put the data model in place that every later phase depends on. No user-visible feature loss.

- Add `trading_workspaces` table (id, user_id, broker_credential_id, name, mode: demo|live, ai_config jsonb, risk_config jsonb, is_active). Backfill one workspace per existing `broker_credentials` row.
- Add `workspace_id` (nullable, backfilled) to `trades`, `trading_signals`, `execution_audit_log`, `model_versions`.
- Add `signal_reasoning` table (signal_id, market_regime, strategy_chosen, why_entry, why_sl, why_tp, confidence_breakdown jsonb, features jsonb).
- Add `signal_events` table = the Universal Signal Hub bus (signal_id, workspace_id, event_type, payload, created_at) with Realtime enabled — every module (dashboard, telegram, monitoring, learning) subscribes here instead of duplicating fan-out.
- Add `shadow_trades` table mirroring `trades` shape for virtual execution of every generated signal.
- RLS + GRANTs on all new tables per project rules.

UI: A workspace switcher pill in the header (reuses `useBrokerAccounts`), demo/live badge everywhere trades render. No workflow change if user only has one workspace.

## Phase 2 — Multi-Asset Engine & Market Regime Detection

Goal: Broaden asset coverage and make strategy selection regime-aware.

- Extend `fetch-market-quotes` with asset-class routing (fx, crypto, metals, energy, indices, stocks, ETFs, agri) using existing providers (Yahoo, Binance, Frankfurter, TrueFX) + graceful "unsupported on this broker" fallback.
- Add `asset_universe` seed table listing symbols, class, session, typical spread, min lot — drives the scanner.
- New edge function `market-regime-detector` (Lovable AI + indicators) returning `{regime, volatility, liquidity, session_quality, news_risk}`, cached per symbol/timeframe.
- Rewrite the scan loop in `unifiedSignalService` + `run-trading-bot` to:
  1. Iterate `asset_universe` filtered by workspace preferences.
  2. Call regime detector.
  3. Rank candidates by confidence × R:R × regime-strategy fit.
  4. Emit only top-N above threshold — quality over quantity.

## Phase 3 — Intelligent Strategy Engine + Dynamic Risk

Goal: Modular strategies + adaptive trade management.

- `strategies/` module in `supabase/functions/_shared/strategies/` with one file per strategy (trend, reversal, breakout, scalp, swing, SMC, ICT, momentum, mean-reversion, S/R, liquidity, session, MTF). Each exports `evaluate(candles, regime) → { signal, confidence, reasoning }`.
- Strategy selector picks/combines strategies based on regime + historical performance from `execution_audit_log`.
- Dynamic risk module computes lot, SL, TP1/2/3, runner, BE trigger, trailing rules from balance, volatility (ATR), asset class, prop-firm constraints.
- New `manage-open-trades` edge function on cron: pulls open trades, applies BE/trailing/partial closes/dynamic TP extension/early exit through the appropriate broker adapter.

## Phase 4 — Safety Layer, Portfolio Risk, News Gate

Goal: Pre-trade validation and account-level guardrails.

- Pre-trade `safety-check` shared module called by `execute-trade`: risk limits, spread, liquidity, margin, broker health, session, news window, strategy confirmation, AI confidence. Rejections logged with reasons.
- Portfolio risk config per workspace: max daily/weekly/monthly loss, exposure, correlated positions, per-asset/per-strategy caps, emergency pause switch, prop-firm profile.
- News gate uses existing `fetch-news` + economic calendar to auto-delay/reduce/pause around high-impact events, auto-resume after.

## Phase 5 — Execution Modes, Telegram Copy, MT5 Copier EA

Goal: Decouple decision from delivery.

- Add `execution_mode` on workspace: analysis | signal | manual_confirm | semi_auto | full_auto | telegram_copy | mt5_copier | native.
- Telegram Copy Trading: extend the existing bot with structured signal messages (entry/SL/TPs/updates) that a downstream copier can parse; sync modifications through `signal_events`.
- MT5 Copier EA: publish a compact JSON feed endpoint (`copier-feed` edge function) + provide a downloadable EA template in `/public/copier/` (docs only in this phase; EA source in a follow-up).
- Two Telegram audiences: user bot (trade info) vs admin bot (reasoning, regime, retraining hints) — controlled via existing `TELEGRAM_*` secrets + admin chat id.

## Phase 6 — Learning, Shadow Trading, Analytics, Hardening

Goal: Close the loop and productionize.

- Trade lifecycle tracker records MFE/MAE, duration, entry/exit quality on close (real + shadow).
- Explainable AI panel on Monitoring/Admin: signal reasoning, confidence breakdown, post-mortem.
- Analytics page rebuilt on real aggregates (asset, strategy, session, regime, confidence buckets, profit factor, drawdown). Removes remaining mock data.
- Continuous learning: `run-retraining` extended to use validated dataset from `signal_reasoning` + closed trades; new model versions require backtest pass before `is_active=true`.
- Hardening pass: move broker API secrets to Supabase Vault, scope CORS to known origins, shared `_shared/brokers/` adapter interface, rate limits on public edge functions, Vitest coverage for execute-trade, safety-check, strategy selector.

---

## Technical notes

- All new edge functions follow existing CORS + `verify_jwt=false` pattern with in-code JWT validation.
- No breaking schema changes — new columns are nullable with backfill; existing pages keep working throughout.
- `unifiedSignalService` stays the single client entry point; new logic slots into its existing loop.
- Existing UI (Dashboard = TradingView + TradingBot only, Monitoring, Signals, Audit Log, Settings) stays; new surfaces are additive tabs/panels.

---

## What I need from you before I start

1. Confirm the 6-phase order or tell me to reprioritize (e.g. Telegram Copy earlier).
2. Confirm I should ship each phase and pause for your validation, not batch everything into one giant build.
3. For Phase 2's asset universe — should I enable all classes by default per workspace, or start with FX + Crypto + Metals + Indices (what your current adapters already handle well) and add the rest as brokers support them?
