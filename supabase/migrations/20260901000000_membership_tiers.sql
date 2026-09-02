-- Family shared garages and Fleet organizations.
-- Existing domain rows keep their owner in user_id; membership grants access
-- to that owner's data without rewriting offline records.

begin;

alter table public.billing_customers
    add column if not exists entitlement_ids text[] not null default '{}';

update public.billing_customers
set entitlement_ids = array[entitlement_id]
where entitlement_id is not null and cardinality(entitlement_ids) = 0;

alter table public.billing_customers drop constraint if exists billing_customers_plan_check;
alter table public.billing_customers
    add constraint billing_customers_plan_check
    check (plan in ('free', 'plus_monthly', 'plus_yearly', 'family_monthly', 'family_yearly', 'fleet'));

create table if not exists public.garages (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null unique references auth.users(id) on delete cascade,
    name text not null default 'My garage' check (char_length(name) between 1 and 80),
    kind text not null default 'personal' check (kind in ('personal', 'family', 'fleet')),
    status text not null default 'active' check (status in ('active', 'suspended')),
    seat_limit integer not null default 1 check (seat_limit > 0),
    vehicle_limit integer check (vehicle_limit is null or vehicle_limit > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.garage_memberships (
    id uuid primary key default gen_random_uuid(),
    garage_id uuid not null references public.garages(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    email text not null check (email = lower(trim(email)) and email like '%@%'),
    display_name text,
    role text not null default 'driver' check (role in ('owner', 'admin', 'driver', 'viewer')),
    status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
    invited_by uuid references auth.users(id) on delete set null,
    accepted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check ((role = 'owner' and status = 'active' and user_id is not null) or role <> 'owner')
);

create unique index if not exists garage_memberships_active_user_idx
    on public.garage_memberships (garage_id, user_id)
    where user_id is not null and status in ('pending', 'active');
create unique index if not exists garage_memberships_pending_email_idx
    on public.garage_memberships (garage_id, email)
    where status in ('pending', 'active');
create index if not exists garage_memberships_user_idx
    on public.garage_memberships (user_id, status);

create table if not exists public.fleet_billing_accounts (
    garage_id uuid primary key references public.garages(id) on delete cascade,
    stripe_customer_id text unique,
    stripe_subscription_id text unique,
    status text not null default 'inactive' check (status in ('trialing', 'active', 'past_due', 'cancelled', 'inactive')),
    licensed_vehicles integer not null default 1 check (licensed_vehicles > 0),
    licensed_members integer not null default 1 check (licensed_members > 0),
    currency text not null default 'eur',
    unit_amount integer,
    current_period_end timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

do $$
declare sync_table text;
begin
    if exists (select 1 from pg_publication where pubname = 'powersync') then
        foreach sync_table in array array['garages', 'garage_memberships', 'fleet_billing_accounts'] loop
            if not exists (
                select 1 from pg_publication_tables
                where pubname = 'powersync' and schemaname = 'public' and tablename = sync_table
            ) then
                execute format('alter publication powersync add table public.%I', sync_table);
            end if;
        end loop;
    end if;
end $$;

alter table public.garages enable row level security;
alter table public.garage_memberships enable row level security;
alter table public.fleet_billing_accounts enable row level security;

revoke all on public.garages, public.garage_memberships, public.fleet_billing_accounts from anon, authenticated;
grant select on public.garages, public.garage_memberships, public.fleet_billing_accounts to authenticated;

create or replace function public.billing_status_is_current(
    status_value text,
    expires_value timestamptz
)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
    select status_value in ('active', 'grace_period', 'billing_issue', 'cancelled')
       and (expires_value is null or expires_value > now())
$$;

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
          and public.billing_status_is_current(customer.status, customer.expires_at)
          and (
              customer.plan in ('family_monthly', 'family_yearly')
              or 'shared_garage' = any(customer.entitlement_ids)
              or customer.entitlement_id = 'shared_garage'
          )
    )
$$;

create or replace function public.billing_owner_has_fleet(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select exists (
        select 1
        from public.garages garage
        join public.fleet_billing_accounts fleet on fleet.garage_id = garage.id
        where garage.owner_user_id = target_owner_id
          and garage.kind = 'fleet'
          and garage.status = 'active'
          and fleet.status in ('trialing', 'active', 'past_due')
          and (fleet.current_period_end is null or fleet.current_period_end > now())
    ) or exists (
        select 1 from public.billing_customers customer
        where customer.user_id = target_owner_id
          and customer.plan = 'fleet'
          and public.billing_status_is_current(customer.status, customer.expires_at)
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
          and public.billing_status_is_current(customer.status, customer.expires_at)
          and (
              customer.plan in ('plus_monthly', 'plus_yearly', 'family_monthly', 'family_yearly')
              or 'plus_features' = any(customer.entitlement_ids)
              or 'shared_garage' = any(customer.entitlement_ids)
              or customer.entitlement_id in ('plus_features', 'shared_garage')
          )
    )
$$;

create or replace function public.billing_can_read_owner(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select target_owner_id = (select auth.uid()) or exists (
        select 1
        from public.garages garage
        join public.garage_memberships member on member.garage_id = garage.id
        where garage.owner_user_id = target_owner_id
          and garage.status = 'active'
          and member.user_id = (select auth.uid())
          and member.status = 'active'
          and (
              (garage.kind = 'family' and public.billing_owner_has_family(target_owner_id))
              or (garage.kind = 'fleet' and public.billing_owner_has_fleet(target_owner_id))
          )
    )
$$;

create or replace function public.billing_can_write_owner(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select target_owner_id = (select auth.uid()) or exists (
        select 1
        from public.garages garage
        join public.garage_memberships member on member.garage_id = garage.id
        where garage.owner_user_id = target_owner_id
          and garage.status = 'active'
          and member.user_id = (select auth.uid())
          and member.status = 'active'
          and member.role in ('owner', 'admin', 'driver')
          and (
              (garage.kind = 'family' and public.billing_owner_has_family(target_owner_id))
              or (garage.kind = 'fleet' and public.billing_owner_has_fleet(target_owner_id))
          )
    )
$$;

create or replace function public.billing_can_admin_owner(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select target_owner_id = (select auth.uid()) or exists (
        select 1
        from public.garages garage
        join public.garage_memberships member on member.garage_id = garage.id
        where garage.owner_user_id = target_owner_id
          and member.user_id = (select auth.uid())
          and member.status = 'active'
          and member.role in ('owner', 'admin')
    )
$$;

revoke all on function public.billing_status_is_current(text, timestamptz) from public;
revoke all on function public.billing_owner_has_family(uuid) from public;
revoke all on function public.billing_owner_has_fleet(uuid) from public;
revoke all on function public.billing_owner_has_plus(uuid) from public;
revoke all on function public.billing_can_read_owner(uuid) from public;
revoke all on function public.billing_can_write_owner(uuid) from public;
revoke all on function public.billing_can_admin_owner(uuid) from public;
grant execute on function public.billing_can_read_owner(uuid) to authenticated;
grant execute on function public.billing_can_write_owner(uuid) to authenticated;
grant execute on function public.billing_can_admin_owner(uuid) to authenticated;

create or replace function public.billing_can_view_garage(target_garage_id uuid, target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select target_owner_id = (select auth.uid()) or exists (
        select 1 from public.garage_memberships member
        where member.garage_id = target_garage_id
          and member.status in ('pending', 'active')
          and (
              member.user_id = (select auth.uid())
              or member.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
          )
    )
$$;

create or replace function public.billing_can_view_membership(
    target_garage_id uuid,
    target_user_id uuid,
    target_email text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select target_user_id = (select auth.uid())
        or target_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
        or exists (
            select 1 from public.garage_memberships caller
            where caller.garage_id = target_garage_id
              and caller.user_id = (select auth.uid())
              and caller.status = 'active'
        )
        or exists (
            select 1 from public.garages garage
            where garage.id = target_garage_id
              and public.billing_can_admin_owner(garage.owner_user_id)
        )
$$;

create or replace function public.billing_can_admin_garage(target_garage_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select exists (
        select 1 from public.garages garage
        where garage.id = target_garage_id
          and public.billing_can_admin_owner(garage.owner_user_id)
    )
$$;

revoke all on function public.billing_can_view_garage(uuid, uuid) from public;
revoke all on function public.billing_can_view_membership(uuid, uuid, text) from public;
revoke all on function public.billing_can_admin_garage(uuid) from public;
grant execute on function public.billing_can_view_garage(uuid, uuid) to authenticated;
grant execute on function public.billing_can_view_membership(uuid, uuid, text) to authenticated;
grant execute on function public.billing_can_admin_garage(uuid) to authenticated;

drop policy if exists "garages_member_select" on public.garages;
create policy "garages_member_select" on public.garages
    for select to authenticated
    using (public.billing_can_view_garage(id, owner_user_id));

drop policy if exists "garage_memberships_member_select" on public.garage_memberships;
create policy "garage_memberships_member_select" on public.garage_memberships
    for select to authenticated
    using (public.billing_can_view_membership(garage_id, user_id, email));

drop policy if exists "fleet_billing_admin_select" on public.fleet_billing_accounts;
create policy "fleet_billing_admin_select" on public.fleet_billing_accounts
    for select to authenticated
    using (public.billing_can_admin_garage(garage_id));

create or replace function public.create_personal_garage_for_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    garage_uuid uuid;
    member_email text;
begin
    member_email := lower(coalesce(new.email, new.id::text || '@autocare.local'));
    insert into public.garages (owner_user_id, name)
    values (new.id, 'My garage')
    on conflict (owner_user_id) do update set owner_user_id = excluded.owner_user_id
    returning id into garage_uuid;

    insert into public.garage_memberships (
        garage_id, user_id, email, display_name, role, status, invited_by, accepted_at
    ) values (
        garage_uuid,
        new.id,
        member_email,
        coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
        'owner',
        'active',
        new.id,
        now()
    ) on conflict do nothing;

    update public.garage_memberships
    set user_id = new.id,
        updated_at = now()
    where email = member_email and user_id is null and status = 'pending';
    return new;
end;
$$;

drop trigger if exists create_personal_garage_after_signup on auth.users;
create trigger create_personal_garage_after_signup
    after insert on auth.users
    for each row execute function public.create_personal_garage_for_user();

insert into public.garages (owner_user_id, name)
select id, 'My garage' from auth.users
on conflict (owner_user_id) do nothing;

insert into public.garage_memberships (
    garage_id, user_id, email, display_name, role, status, invited_by, accepted_at
)
select garage.id,
       users.id,
       lower(coalesce(users.email, users.id::text || '@autocare.local')),
       coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name'),
       'owner',
       'active',
       users.id,
       now()
from auth.users users
join public.garages garage on garage.owner_user_id = users.id
on conflict do nothing;

create or replace function public.sync_consumer_garage_tier()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    update public.garages
    set kind = case
            when public.billing_owner_has_family(new.user_id) then 'family'
            when kind = 'family' then 'personal'
            else kind
        end,
        seat_limit = case
            when public.billing_owner_has_family(new.user_id) then greatest(seat_limit, 6)
            when kind = 'family' then 1
            else seat_limit
        end,
        updated_at = now()
    where owner_user_id = new.user_id and kind <> 'fleet';
    return new;
end;
$$;

drop trigger if exists sync_consumer_garage_tier_after_billing on public.billing_customers;
create trigger sync_consumer_garage_tier_after_billing
    after insert or update on public.billing_customers
    for each row execute function public.sync_consumer_garage_tier();

update public.garages garage
set kind = 'family', seat_limit = greatest(garage.seat_limit, 6), updated_at = now()
where garage.kind <> 'fleet' and public.billing_owner_has_family(garage.owner_user_id);

create or replace function public.invite_garage_member(
    target_garage_id uuid,
    invite_email text,
    invite_role text default 'driver'
)
returns public.garage_memberships
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    garage_row public.garages;
    normalized_email text;
    matched_user_id uuid;
    member_count integer;
    allowed_members integer;
    result public.garage_memberships;
begin
    select * into garage_row from public.garages where id = target_garage_id for update;
    if not found or not public.billing_can_admin_owner(garage_row.owner_user_id) then
        raise exception 'You cannot manage this garage.' using errcode = '42501';
    end if;
    if garage_row.kind = 'family' and not public.billing_owner_has_family(garage_row.owner_user_id) then
        raise exception 'An active Family plan is required.' using errcode = '42501';
    end if;
    if garage_row.kind = 'fleet' and not public.billing_owner_has_fleet(garage_row.owner_user_id) then
        raise exception 'An active Fleet plan is required.' using errcode = '42501';
    end if;
    if garage_row.kind = 'personal' then
        raise exception 'Upgrade to Family before inviting members.' using errcode = '42501';
    end if;
    if invite_role not in ('admin', 'driver', 'viewer') then
        raise exception 'Invalid member role.' using errcode = '22023';
    end if;
    normalized_email := lower(trim(invite_email));
    if normalized_email = '' or normalized_email not like '%@%' then
        raise exception 'Enter a valid email address.' using errcode = '22023';
    end if;
    select id into matched_user_id from auth.users where lower(email) = normalized_email limit 1;
    select count(*) into member_count
    from public.garage_memberships
    where garage_id = target_garage_id and status in ('pending', 'active');
    select case
        when garage_row.kind = 'fleet' then coalesce(
            (select licensed_members from public.fleet_billing_accounts where garage_id = target_garage_id),
            garage_row.seat_limit
        )
        else garage_row.seat_limit
    end into allowed_members;
    if member_count >= allowed_members then
        raise exception 'This garage has reached its member limit.' using errcode = '23514';
    end if;

    insert into public.garage_memberships (
        garage_id, user_id, email, role, status, invited_by, accepted_at
    ) values (
        target_garage_id,
        matched_user_id,
        normalized_email,
        invite_role,
        case when matched_user_id = (select auth.uid()) then 'active' else 'pending' end,
        (select auth.uid()),
        case when matched_user_id = (select auth.uid()) then now() else null end
    ) returning * into result;
    return result;
end;
$$;

create or replace function public.accept_garage_invitation(target_membership_id uuid)
returns public.garage_memberships
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    result public.garage_memberships;
    garage_row public.garages;
    current_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
begin
    select * into result from public.garage_memberships where id = target_membership_id for update;
    if not found or result.status <> 'pending'
       or not (result.user_id = (select auth.uid()) or result.email = current_email) then
        raise exception 'This invitation is not available.' using errcode = '42501';
    end if;
    select * into garage_row from public.garages where id = result.garage_id;
    if (garage_row.kind = 'family' and not public.billing_owner_has_family(garage_row.owner_user_id))
       or (garage_row.kind = 'fleet' and not public.billing_owner_has_fleet(garage_row.owner_user_id))
       or garage_row.kind = 'personal' then
        raise exception 'The garage sharing plan is not active.' using errcode = '42501';
    end if;
    update public.garage_memberships
    set user_id = (select auth.uid()), status = 'active', accepted_at = now(), updated_at = now()
    where id = target_membership_id
    returning * into result;
    return result;
end;
$$;

create or replace function public.decline_garage_invitation(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    update public.garage_memberships
    set status = 'revoked', updated_at = now()
    where id = target_membership_id
      and status = 'pending'
      and (
          user_id = (select auth.uid())
          or email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      );
    if not found then raise exception 'This invitation is not available.' using errcode = '42501'; end if;
end;
$$;

create or replace function public.remove_garage_member(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare target_owner_id uuid;
begin
    select garage.owner_user_id into target_owner_id
    from public.garage_memberships member
    join public.garages garage on garage.id = member.garage_id
    where member.id = target_membership_id and member.role <> 'owner';
    if target_owner_id is null or not public.billing_can_admin_owner(target_owner_id) then
        raise exception 'You cannot remove this member.' using errcode = '42501';
    end if;
    update public.garage_memberships
    set status = 'revoked', updated_at = now()
    where id = target_membership_id and role <> 'owner';
end;
$$;

create or replace function public.update_garage_member_role(
    target_membership_id uuid,
    new_role text
)
returns public.garage_memberships
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    target_owner_id uuid;
    result public.garage_memberships;
begin
    if new_role not in ('admin', 'driver', 'viewer') then
        raise exception 'Invalid member role.' using errcode = '22023';
    end if;
    select garage.owner_user_id into target_owner_id
    from public.garage_memberships member
    join public.garages garage on garage.id = member.garage_id
    where member.id = target_membership_id and member.role <> 'owner';
    if target_owner_id is null or not public.billing_can_admin_owner(target_owner_id) then
        raise exception 'You cannot change this member.' using errcode = '42501';
    end if;
    update public.garage_memberships
    set role = new_role, updated_at = now()
    where id = target_membership_id and role <> 'owner'
    returning * into result;
    return result;
end;
$$;

create or replace function public.rename_garage(target_garage_id uuid, new_name text)
returns public.garages
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare result public.garages;
begin
    if char_length(trim(new_name)) not between 1 and 80 then
        raise exception 'Garage name must contain 1 to 80 characters.' using errcode = '22023';
    end if;
    update public.garages
    set name = trim(new_name), updated_at = now()
    where id = target_garage_id and public.billing_can_admin_owner(owner_user_id)
    returning * into result;
    if result.id is null then raise exception 'You cannot rename this garage.' using errcode = '42501'; end if;
    return result;
end;
$$;

revoke all on function public.invite_garage_member(uuid, text, text) from public;
revoke all on function public.accept_garage_invitation(uuid) from public;
revoke all on function public.decline_garage_invitation(uuid) from public;
revoke all on function public.remove_garage_member(uuid) from public;
revoke all on function public.update_garage_member_role(uuid, text) from public;
revoke all on function public.rename_garage(uuid, text) from public;
grant execute on function public.invite_garage_member(uuid, text, text) to authenticated;
grant execute on function public.accept_garage_invitation(uuid) to authenticated;
grant execute on function public.decline_garage_invitation(uuid) to authenticated;
grant execute on function public.remove_garage_member(uuid) to authenticated;
grant execute on function public.update_garage_member_role(uuid, text) to authenticated;
grant execute on function public.rename_garage(uuid, text) to authenticated;

-- Replace owner-only domain policies with role-aware garage policies.
do $$
declare
    table_name text;
    policy_prefix text;
begin
    foreach table_name in array array[
        'vehicles', 'fuel_expenses', 'insurance_expenses', 'service_expenses',
        'general_expenses', 'reminders', 'vehicle_documents', 'service_parts'
    ] loop
        policy_prefix := table_name || '_owner';
        execute format('drop policy if exists %I on public.%I', policy_prefix || '_select', table_name);
        execute format('drop policy if exists %I on public.%I', policy_prefix || '_insert', table_name);
        execute format('drop policy if exists %I on public.%I', policy_prefix || '_update', table_name);
        execute format('drop policy if exists %I on public.%I', policy_prefix || '_delete', table_name);
        execute format('drop policy if exists %I on public.%I', policy_prefix || '_all', table_name);
        execute format('create policy %I on public.%I for select to authenticated using (public.billing_can_read_owner(user_id))', policy_prefix || '_select', table_name);
        execute format('create policy %I on public.%I for insert to authenticated with check (public.billing_can_write_owner(user_id))', policy_prefix || '_insert', table_name);
        execute format('create policy %I on public.%I for update to authenticated using (public.billing_can_write_owner(user_id)) with check (public.billing_can_write_owner(user_id))', policy_prefix || '_update', table_name);
        execute format('create policy %I on public.%I for delete to authenticated using (public.billing_can_write_owner(user_id))', policy_prefix || '_delete', table_name);
    end loop;
end $$;

create or replace function public.billing_can_insert_vehicle(
    target_user_id uuid,
    target_vehicle_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select public.billing_can_write_owner(target_user_id) and (
        exists (select 1 from public.vehicles where user_id = target_user_id and id = target_vehicle_id)
        or public.billing_owner_has_plus(target_user_id)
        or not exists (select 1 from public.vehicles where user_id = target_user_id)
    )
$$;

create or replace function public.billing_has_plus(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select public.billing_can_read_owner(target_user_id)
       and public.billing_owner_has_plus(target_user_id)
$$;

drop policy if exists "vehicles_owner_insert" on public.vehicles;
create policy "vehicles_owner_insert" on public.vehicles
    for insert to authenticated
    with check (public.billing_can_insert_vehicle(user_id, id));

create or replace function public.enforce_vehicle_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare fleet_limit integer;
begin
    if (select auth.uid()) is null then return new; end if;
    if not public.billing_can_write_owner(new.user_id) then
        raise exception 'You cannot add vehicles to this garage.' using errcode = '42501';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
    if public.billing_owner_has_fleet(new.user_id) then
        select fleet.licensed_vehicles into fleet_limit
        from public.garages garage
        join public.fleet_billing_accounts fleet on fleet.garage_id = garage.id
        where garage.owner_user_id = new.user_id;
        if fleet_limit is not null and (
            select count(*) from public.vehicles where user_id = new.user_id and id <> new.id
        ) >= fleet_limit then
            raise exception 'This Fleet garage has reached its vehicle limit.' using errcode = '23514';
        end if;
    elsif not public.billing_owner_has_plus(new.user_id) and exists (
        select 1 from public.vehicles where user_id = new.user_id and id <> new.id
    ) then
        raise exception 'AutoCare Plus is required for more than one vehicle.' using errcode = '42501';
    end if;
    return new;
end;
$$;

drop policy if exists "vehicle_documents_owner_insert" on public.vehicle_documents;
create policy "vehicle_documents_owner_insert" on public.vehicle_documents
    for insert to authenticated
    with check (
        public.billing_can_write_owner(user_id)
        and public.billing_owner_has_plus(user_id)
    );

create or replace function public.billing_can_set_recurring_reminder(
    target_user_id uuid,
    repeat_months_value integer,
    repeat_km_value integer
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select public.billing_can_write_owner(target_user_id) and (
        (coalesce(repeat_months_value, 0) <= 0 and coalesce(repeat_km_value, 0) <= 0)
        or public.billing_owner_has_plus(target_user_id)
    )
$$;

drop policy if exists "reminders_owner_insert" on public.reminders;
create policy "reminders_owner_insert" on public.reminders
    for insert to authenticated
    with check (public.billing_can_set_recurring_reminder(user_id, repeat_months, repeat_km));
drop policy if exists "reminders_owner_update" on public.reminders;
create policy "reminders_owner_update" on public.reminders
    for update to authenticated
    using (public.billing_can_write_owner(user_id))
    with check (public.billing_can_set_recurring_reminder(user_id, repeat_months, repeat_km));

create or replace function public.billing_path_owner(object_name text)
returns uuid
language sql
immutable
set search_path = pg_catalog
as $$
    select case
        when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then split_part(object_name, '/', 1)::uuid
        else null
    end
$$;

grant execute on function public.billing_status_is_current(text, timestamptz) to authenticated;
grant execute on function public.billing_owner_has_family(uuid) to authenticated;
grant execute on function public.billing_owner_has_fleet(uuid) to authenticated;
grant execute on function public.billing_owner_has_plus(uuid) to authenticated;
grant execute on function public.billing_path_owner(text) to authenticated;
grant execute on function public.billing_can_insert_vehicle(uuid, uuid) to authenticated;
grant execute on function public.billing_can_set_recurring_reminder(uuid, integer, integer) to authenticated;
grant execute on function public.billing_has_plus(uuid) to authenticated;

drop policy if exists "vehicle_document_files_read" on storage.objects;
drop policy if exists "vehicle_document_files_insert" on storage.objects;
drop policy if exists "vehicle_document_files_update" on storage.objects;
drop policy if exists "vehicle_document_files_delete" on storage.objects;

create policy "vehicle_document_files_read" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'vehicle-documents'
        and public.billing_can_read_owner(public.billing_path_owner(name))
    );
create policy "vehicle_document_files_insert" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'vehicle-documents'
        and public.billing_can_write_owner(public.billing_path_owner(name))
        and public.billing_owner_has_plus(public.billing_path_owner(name))
    );
create policy "vehicle_document_files_update" on storage.objects
    for update to authenticated
    using (
        bucket_id = 'vehicle-documents'
        and public.billing_can_write_owner(public.billing_path_owner(name))
        and public.billing_owner_has_plus(public.billing_path_owner(name))
    )
    with check (
        bucket_id = 'vehicle-documents'
        and public.billing_can_write_owner(public.billing_path_owner(name))
        and public.billing_owner_has_plus(public.billing_path_owner(name))
    );
create policy "vehicle_document_files_delete" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'vehicle-documents'
        and public.billing_can_write_owner(public.billing_path_owner(name))
    );

notify pgrst, 'reload schema';

commit;
