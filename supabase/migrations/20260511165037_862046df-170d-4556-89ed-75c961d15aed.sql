create table if not exists public.model_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  model_id uuid not null,
  version text not null,
  previous_version text,
  trained_at timestamp with time zone not null default now(),
  activated_for_signals_at timestamp with time zone not null default now(),
  trigger_reason text not null default 'manual',
  executed_trade_count integer not null default 0,
  trade_sample_window_start timestamp with time zone,
  trade_sample_window_end timestamp with time zone,
  metrics jsonb not null default '{}'::jsonb,
  model_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  unique (model_id, version)
);

alter table public.model_versions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'model_versions' and policyname = 'Users can view their own model versions'
  ) then
    create policy "Users can view their own model versions"
    on public.model_versions
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'model_versions' and policyname = 'Users can create their own model versions'
  ) then
    create policy "Users can create their own model versions"
    on public.model_versions
    for insert
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'model_versions' and policyname = 'Admins can view all model versions'
  ) then
    create policy "Admins can view all model versions"
    on public.model_versions
    for select
    using (app_private.has_role(auth.uid(), 'admin'::public.app_role));
  end if;
end $$;

create index if not exists idx_model_versions_model_trained
on public.model_versions (model_id, trained_at desc);

create index if not exists idx_model_versions_user_trained
on public.model_versions (user_id, trained_at desc);

create index if not exists idx_trades_model_filled_created
on public.trades (model_id, user_id, created_at desc)
where last_execution_status = 'filled';

create index if not exists idx_trading_signals_model_created
on public.trading_signals (model_id, created_at desc)
where model_id is not null;