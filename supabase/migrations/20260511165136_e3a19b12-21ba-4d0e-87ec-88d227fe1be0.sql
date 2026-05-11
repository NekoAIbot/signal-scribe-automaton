alter table public.trading_signals
add column if not exists model_version text;

alter table public.trades
add column if not exists model_version text;

alter table public.execution_audit_log
add column if not exists model_version text;

create index if not exists idx_trading_signals_model_version_created
on public.trading_signals (model_id, model_version, created_at desc)
where model_id is not null;

create index if not exists idx_trades_model_version_created
on public.trades (model_id, model_version, created_at desc)
where model_id is not null;