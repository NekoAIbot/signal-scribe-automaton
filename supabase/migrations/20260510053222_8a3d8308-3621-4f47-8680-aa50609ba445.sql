create table if not exists public.trading_bot_settings (
  user_id uuid primary key,
  bot_enabled boolean not null default true,
  telegram_enabled boolean not null default true,
  interval_seconds integer not null default 60,
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

alter table public.trading_bot_settings enable row level security;

create policy "Users can view their own bot settings"
on public.trading_bot_settings
for select
using (auth.uid() = user_id);

create policy "Users can create their own bot settings"
on public.trading_bot_settings
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own bot settings"
on public.trading_bot_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins can view bot settings"
on public.trading_bot_settings
for select
using (public.has_role(auth.uid(), 'admin'::app_role));

create trigger update_trading_bot_settings_updated_at
before update on public.trading_bot_settings
for each row
execute function public.update_updated_at();

create index if not exists idx_trading_bot_settings_enabled
on public.trading_bot_settings (bot_enabled, telegram_enabled, updated_at);

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;