# Signal Scribe Automaton — Remaining Work Before Full Production

_Date: 2026-04-03_

## Executive Summary

The project is **feature-rich but not yet production-ready**.

To reach full production safely (especially for live trade execution), the remaining work is concentrated in five areas:

1. **Code quality baseline (lint/type discipline)**
2. **Execution reliability and broker connectivity hardening**
3. **Security/compliance hardening**
4. **Observability/testing/CI**
5. **Operational readiness and controlled rollout**

---

## 1) Must-fix blockers (P0)

### 1.1 Lint and type debt must be cleared
- Current status from local run: `npm run lint` reports **75 errors** and **13 warnings**.
- Primary issues: pervasive `any`, empty blocks, hook dependency warnings, and config import style violations.

**Production requirement:**
- `npm run lint` passes with zero errors.
- Type contracts defined for trading payloads, edge responses, and strategy/model objects.

### 1.2 Real execution path validation (end-to-end)
Even with live path wiring improvements, production requires verified E2E execution in staging with real broker credentials and auditable outcomes.

**Production requirement:**
- Successful order placement for BUY and SELL flows on connected accounts.
- Confirmed DB persistence (`trades`, `trading_signals`) and notification side-effects.
- Clear and user-readable failure reasons for each failed execution path.

### 1.3 Replace mock/fallback behavior in user-facing critical paths
Mock/fallback behavior still exists for market data/news/sentiment/model insights/backtesting.

**Production requirement:**
- Live providers configured and monitored.
- Fallback mode clearly tagged in UI and event logs.
- Backtest engine uses deterministic historical data instead of pure simulation.

---

## 2) Security hardening required (P0/P1)

### 2.1 CORS and edge access policies
- Multiple edge functions still use wildcard CORS (`*`).

**Production requirement:**
- Restrict allowed origins to production/staging domains.
- Verify authorization checks for every mutating endpoint.

### 2.2 Broker credential handling
- Current flow includes base64 decoding helper in trade execution path.

**Production requirement:**
- Move to robust encryption-at-rest model for broker secrets.
- Add key rotation and credential validation/revocation workflow.

### 2.3 Risk controls and guardrails
- Risk checks exist but need stricter hardening and test coverage.

**Production requirement:**
- Unit/integration validation of lot limits, drawdown thresholds, and open-position limits.
- Immutable audit trail for risk-denied trades.

---

## 3) Reliability and QA gaps (P1)

### 3.1 Automated tests
No substantial automated test suite currently protects core trading workflows.

**Production requirement:**
- Unit tests for core signal/risk/calculation logic.
- Integration tests for edge functions (`execute-trade`, `send-notification`, `prop-risk-monitor`).
- E2E happy-path + failure-path tests on staging.

### 3.2 CI/CD gates
No enforced merge gates are visible for lint/build/test/schema checks.

**Production requirement:**
- CI pipeline with required checks (lint, build, tests, migration checks).
- Branch protection + required status checks.

### 3.3 Error tracking and SLO monitoring
No unified error budget/SLO instrumentation is visible.

**Production requirement:**
- Centralized logging and alerting (frontend + edge functions).
- Dashboards for execution success rate, latency, rejection rate, and notification failures.

---

## 4) Performance and product hardening (P1/P2)

### 4.1 Bundle optimization
Current build warns about large chunk size.

**Production requirement:**
- Route/component code splitting.
- Controlled lazy-loading for admin/analytics-heavy modules.

### 4.2 UX transparency during degraded mode
When providers fail or fall back, users need explicit visibility.

**Production requirement:**
- UI badge/state for mock/degraded data.
- Retry and fallback explanations near affected widgets.

---

## 5) Launch operations (P0/P1)

### 5.1 Environment readiness
**Production requirement:**
- Complete secret inventory for all providers (MetaApi/bridge/news/AI/Telegram/email).
- Distinct staging vs production credentials.

### 5.2 Runbooks
**Production requirement:**
- Incident runbook (trade failure, provider outage, notification outage, bad release).
- Rollback runbook with verified migration rollback strategy.

### 5.3 Controlled go-live
**Production requirement:**
- Phased rollout: internal → beta users on demo accounts → limited live users → broader release.
- Formal go/no-go checklist signed by engineering + product + risk owner.

---

## 6) Suggested order of execution

### Phase A (Week 1–2): Stabilize codebase
- Clear lint/type blockers.
- Lock execution DTOs and edge response contracts.

### Phase B (Week 2–3): Execution + security hardening
- Full staging E2E broker execution validation.
- Restrict CORS and harden secret handling.

### Phase C (Week 3–4): Quality + observability
- Add tests, CI gates, and monitoring dashboards.

### Phase D (Week 4+): Controlled production rollout
- Deploy with feature flags and staged account cohorts.

---

## Definition of “Production Ready” for this project

The project should be considered production-ready only when all are true:

1. Lint/build/tests pass in CI.
2. Live broker execution passes staging E2E with auditable success/failure.
3. Security controls are enforced (restricted CORS, secret protections, risk policy tests).
4. Monitoring and incident response are operational.
5. Rollout/governance checklist is complete.
