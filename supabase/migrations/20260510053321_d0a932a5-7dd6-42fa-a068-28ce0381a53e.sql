create schema if not exists app_private;

create or replace function app_private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

revoke all on function app_private.has_role(uuid, public.app_role) from public, anon, authenticated;
grant usage on schema app_private to authenticated, service_role;
grant execute on function app_private.has_role(uuid, public.app_role) to authenticated, service_role;

alter policy "Admins can update any profile" on public.profiles
using (app_private.has_role(auth.uid(), 'admin'::public.app_role));

alter policy "Admins can view all profiles" on public.profiles
using (app_private.has_role(auth.uid(), 'admin'::public.app_role));

alter policy "Admins can manage plans" on public.subscription_plans
using (app_private.has_role(auth.uid(), 'admin'::public.app_role));

alter policy "Admins can view all trades" on public.trades
using (app_private.has_role(auth.uid(), 'admin'::public.app_role));

alter policy "Admins can view all strategies" on public.trading_strategies
using (app_private.has_role(auth.uid(), 'admin'::public.app_role));

alter policy "Admins can manage roles" on public.user_roles
using (app_private.has_role(auth.uid(), 'admin'::public.app_role));

alter policy "Admins can view all roles" on public.user_roles
using (app_private.has_role(auth.uid(), 'admin'::public.app_role));

alter policy "Admins view all audit log" on public.execution_audit_log
using (app_private.has_role(auth.uid(), 'admin'::public.app_role));

alter policy "Admins can view bot settings" on public.trading_bot_settings
using (app_private.has_role(auth.uid(), 'admin'::public.app_role));

revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;