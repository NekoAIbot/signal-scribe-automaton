create table if not exists public.model_retraining_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  model_id uuid not null,
  status text not null default 'pending',
  trigger_reason text not null default 'executed_trade_threshold',
  triggering_trade_count integer not null default 0,
  trade_sample_window_start timestamp with time zone,
  trade_sample_window_end timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  result_version text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.model_retraining_jobs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'model_retraining_jobs' and policyname = 'Users can view their own retraining jobs'
  ) then
    create policy "Users can view their own retraining jobs"
    on public.model_retraining_jobs
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'model_retraining_jobs' and policyname = 'Admins can view all retraining jobs'
  ) then
    create policy "Admins can view all retraining jobs"
    on public.model_retraining_jobs
    for select
    using (app_private.has_role(auth.uid(), 'admin'::public.app_role));
  end if;
end $$;

drop trigger if exists update_model_retraining_jobs_updated_at on public.model_retraining_jobs;
create trigger update_model_retraining_jobs_updated_at
before update on public.model_retraining_jobs
for each row
execute function public.update_updated_at();

create unique index if not exists idx_model_retraining_jobs_one_active
on public.model_retraining_jobs (model_id)
where status in ('pending', 'processing');

create index if not exists idx_model_retraining_jobs_status_created
on public.model_retraining_jobs (status, created_at asc);