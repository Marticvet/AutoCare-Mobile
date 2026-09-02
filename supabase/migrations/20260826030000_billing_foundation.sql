-- Trusted RevenueCat mirror and Plus feature enforcement.
-- Apply after the offline/sync reliability migrations.

begin;

create table if not exists public.billing_customers (
    user_id uuid primary key references auth.users(id) on delete cascade,
    app_user_id text not null unique,
    entitlement_id text,
    plan text not null default 'free' check (plan in ('free', 'plus_monthly', 'plus_yearly')),
    product_id text,
    status text not null default 'unknown' check (status in ('active', 'grace_period', 'billing_issue', 'cancelled', 'expired', 'refunded', 'unknown')),
    expires_at timestamptz,
    will_renew boolean not null default false,
    store text,
    environment text,
    last_event_id text,
    updated_at timestamptz not null default now()
);

create table if not exists public.billing_webhook_events (
    event_id text primary key,
    event_type text not null,
    app_user_id text,
    payload jsonb not null,
    received_at timestamptz not null default now(),
    processed_at timestamptz,
    processing_error text
);

create index if not exists billing_customers_status_idx
    on public.billing_customers (status, expires_at);
create index if not exists billing_webhook_events_received_idx
    on public.billing_webhook_events (received_at desc);

alter table public.billing_customers enable row level security;
alter table public.billing_webhook_events enable row level security;

revoke all on table public.billing_customers from anon, authenticated;
revoke all on table public.billing_webhook_events from anon, authenticated;
grant select on table public.billing_customers to authenticated;

drop policy if exists "billing_customer_owner_select" on public.billing_customers;
create policy "billing_customer_owner_select" on public.billing_customers
    for select to authenticated
    using ((select auth.uid()) = user_id);

-- No client policies exist on billing_webhook_events and no client write
-- policies exist on billing_customers. Edge Functions use the service role.

create or replace function public.billing_has_plus(target_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
    if target_user_id is distinct from (select auth.uid()) then
        return false;
    end if;
    return exists (
        select 1
        from public.billing_customers customer
        where customer.user_id = target_user_id
          and customer.entitlement_id = 'plus_features'
          and customer.status in ('active', 'grace_period', 'billing_issue', 'cancelled')
          and (customer.expires_at is null or customer.expires_at > now())
    );
end;
$$;

create or replace function public.billing_can_add_vehicle(target_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
    if target_user_id is distinct from (select auth.uid()) then
        return false;
    end if;
    return (
        select count(*) < 1 from public.vehicles where user_id = target_user_id
    ) or public.billing_has_plus(target_user_id);
end;
$$;

create or replace function public.billing_can_set_recurring_reminder(
    target_user_id uuid,
    repeat_months_value integer,
    repeat_km_value integer
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
    if coalesce(repeat_months_value, 0) <= 0 and coalesce(repeat_km_value, 0) <= 0 then
        return target_user_id = (select auth.uid());
    end if;
    return public.billing_has_plus(target_user_id);
end;
$$;

revoke all on function public.billing_has_plus(uuid) from public;
revoke all on function public.billing_can_add_vehicle(uuid) from public;
revoke all on function public.billing_can_set_recurring_reminder(uuid, integer, integer) from public;
grant execute on function public.billing_has_plus(uuid) to authenticated;
grant execute on function public.billing_can_add_vehicle(uuid) to authenticated;
grant execute on function public.billing_can_set_recurring_reminder(uuid, integer, integer) to authenticated;

-- A Free user may insert their first vehicle. Existing vehicles remain fully
-- readable/editable if Plus later expires.
drop policy if exists "vehicles_owner_insert" on public.vehicles;
create policy "vehicles_owner_insert" on public.vehicles
    for insert to authenticated
    with check (
        (select auth.uid()) = user_id
        and public.billing_can_add_vehicle(user_id)
    );

-- Document creation is a Plus capability. Existing documents remain available
-- and may be deleted after expiry; clients never lose stored data.
drop policy if exists "vehicle_documents_owner_insert" on public.vehicle_documents;
create policy "vehicle_documents_owner_insert" on public.vehicle_documents
    for insert to authenticated
    with check (
        (select auth.uid()) = user_id
        and public.billing_has_plus(user_id)
    );

-- Basic one-off reminders stay Free. Recurrence requires Plus on inserts and
-- updates, while clearing recurrence is always allowed by the owner.
drop policy if exists "reminders_owner_insert" on public.reminders;
create policy "reminders_owner_insert" on public.reminders
    for insert to authenticated
    with check (
        (select auth.uid()) = user_id
        and public.billing_can_set_recurring_reminder(user_id, repeat_months, repeat_km)
    );

drop policy if exists "reminders_owner_update" on public.reminders;
create policy "reminders_owner_update" on public.reminders
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check (
        (select auth.uid()) = user_id
        and public.billing_can_set_recurring_reminder(user_id, repeat_months, repeat_km)
    );

notify pgrst, 'reload schema';

commit;
