-- Trusted administrator access. The app reads this row, while all paid-feature
-- enforcement continues to happen in database functions and RLS policies.

begin;

alter table public.billing_customers
    add column if not exists is_admin boolean not null default false;

insert into public.billing_customers (
    user_id,
    app_user_id,
    entitlement_id,
    entitlement_ids,
    plan,
    product_id,
    status,
    expires_at,
    will_renew,
    store,
    environment,
    updated_at,
    is_admin
)
select
    users.id,
    users.id::text,
    null,
    '{}'::text[],
    'free',
    null,
    'unknown',
    null,
    false,
    null,
    null,
    now(),
    true
from auth.users users
where lower(users.email) = 'martigiant3@gmail.com'
on conflict (user_id) do update
set is_admin = true,
    updated_at = now();

create or replace function public.assign_autocare_admin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
    insert into public.billing_customers (
        user_id,
        app_user_id,
        entitlement_id,
        entitlement_ids,
        plan,
        product_id,
        status,
        expires_at,
        will_renew,
        store,
        environment,
        updated_at,
        is_admin
    ) values (
        new.id,
        new.id::text,
        null,
        '{}'::text[],
        'free',
        null,
        'unknown',
        null,
        false,
        null,
        null,
        now(),
        lower(coalesce(new.email, '')) = 'martigiant3@gmail.com'
    )
    on conflict (user_id) do update
    set is_admin = excluded.is_admin,
        updated_at = now();
    return new;
end;
$$;

revoke all on function public.assign_autocare_admin() from public;

drop trigger if exists assign_autocare_admin on auth.users;
create trigger assign_autocare_admin
    after insert or update of email on auth.users
    for each row execute function public.assign_autocare_admin();

create or replace function public.billing_owner_has_family(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select exists (
        select 1 from public.billing_customers customer
        where customer.user_id = target_owner_id
          and (
              customer.is_admin
              or (
                  public.billing_status_is_current(customer.status, customer.expires_at)
                  and (
                      customer.plan in ('family_monthly', 'family_yearly')
                      or 'shared_garage' = any(customer.entitlement_ids)
                      or customer.entitlement_id = 'shared_garage'
                  )
              )
          )
    )
$$;

create or replace function public.billing_owner_has_plus(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select public.billing_owner_has_fleet(target_owner_id) or exists (
        select 1 from public.billing_customers customer
        where customer.user_id = target_owner_id
          and (
              customer.is_admin
              or (
                  public.billing_status_is_current(customer.status, customer.expires_at)
                  and (
                      customer.plan in ('plus_monthly', 'plus_yearly', 'family_monthly', 'family_yearly')
                      or 'plus_features' = any(customer.entitlement_ids)
                      or 'shared_garage' = any(customer.entitlement_ids)
                      or customer.entitlement_id in ('plus_features', 'shared_garage')
                  )
              )
          )
    )
$$;

grant execute on function public.billing_owner_has_family(uuid) to authenticated;
grant execute on function public.billing_owner_has_plus(uuid) to authenticated;

-- Re-run the existing billing-to-garage trigger now that administrator access
-- is part of the trusted Family/Plus checks.
update public.billing_customers
set updated_at = now()
where is_admin;

notify pgrst, 'reload schema';

commit;
