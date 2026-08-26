-- Consolidated schema and security hotfix for the current mobile client.
-- This migration is additive and safe to run more than once.

begin;

alter table public.profiles
    add column if not exists phone_country_code text;

alter table public.vehicles
    add column if not exists vehicle_year_of_manufacture integer,
    add column if not exists vehicle_identification_number text,
    add column if not exists vehicle_trim text,
    add column if not exists vehicle_fuel_type text;

update public.vehicles
set vehicle_year_of_manufacture = vehicle_model_year
where vehicle_year_of_manufacture is null
  and vehicle_model_year is not null
  and vehicle_model_year <= extract(year from current_date)::integer;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'profiles_phone_country_code_format'
          and conrelid = 'public.profiles'::regclass
    ) then
        alter table public.profiles
            add constraint profiles_phone_country_code_format
            check (phone_country_code is null or phone_country_code ~ '^\+[1-9][0-9]{0,3}$')
            not valid;
    end if;
end $$;

create or replace function public.validate_autocare_vehicle_years()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    current_year integer := extract(year from current_date)::integer;
begin
    if new.vehicle_year_of_manufacture is not null
       and (new.vehicle_year_of_manufacture < 1886 or new.vehicle_year_of_manufacture > current_year) then
        raise exception 'Manufacture year must be between 1886 and %', current_year
            using errcode = '23514';
    end if;

    if new.vehicle_model_year is not null
       and (new.vehicle_model_year < 1886 or new.vehicle_model_year > current_year + 2) then
        raise exception 'Model year must be between 1886 and %', current_year + 2
            using errcode = '23514';
    end if;

    return new;
end;
$$;

drop trigger if exists validate_autocare_vehicle_years_trigger on public.vehicles;
create trigger validate_autocare_vehicle_years_trigger
    before insert or update of vehicle_model_year, vehicle_year_of_manufacture
    on public.vehicles
    for each row execute function public.validate_autocare_vehicle_years();

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.fuel_expenses enable row level security;
alter table public.insurance_expenses enable row level security;
alter table public.service_expenses enable row level security;
alter table public.general_expenses enable row level security;
alter table public.reminders enable row level security;
alter table public.vehicle_documents enable row level security;
alter table public.service_parts enable row level security;

grant select, insert, update, delete on table
    public.profiles,
    public.vehicles,
    public.fuel_expenses,
    public.insurance_expenses,
    public.service_expenses,
    public.general_expenses,
    public.reminders,
    public.vehicle_documents,
    public.service_parts
to authenticated;

drop policy if exists "profiles_owner_select" on public.profiles;
drop policy if exists "profiles_owner_insert" on public.profiles;
drop policy if exists "profiles_owner_update" on public.profiles;
drop policy if exists "profiles_owner_delete" on public.profiles;
create policy "profiles_owner_select" on public.profiles
    for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_owner_insert" on public.profiles
    for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_owner_update" on public.profiles
    for update to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);
create policy "profiles_owner_delete" on public.profiles
    for delete to authenticated using ((select auth.uid()) = id);

do $$
declare
    table_name text;
    policy_prefix text;
begin
    foreach table_name in array array[
        'vehicles',
        'fuel_expenses',
        'insurance_expenses',
        'service_expenses',
        'general_expenses',
        'reminders',
        'vehicle_documents',
        'service_parts'
    ] loop
        policy_prefix := table_name || '_owner';
        execute format('drop policy if exists %I on public.%I', policy_prefix || '_select', table_name);
        execute format('drop policy if exists %I on public.%I', policy_prefix || '_insert', table_name);
        execute format('drop policy if exists %I on public.%I', policy_prefix || '_update', table_name);
        execute format('drop policy if exists %I on public.%I', policy_prefix || '_delete', table_name);
        execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', policy_prefix || '_select', table_name);
        execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', policy_prefix || '_insert', table_name);
        execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', policy_prefix || '_update', table_name);
        execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', policy_prefix || '_delete', table_name);
    end loop;
end $$;

do $$
declare
    table_name text;
begin
    if exists (select 1 from pg_publication where pubname = 'powersync') then
        foreach table_name in array array[
            'profiles',
            'vehicles',
            'fuel_expenses',
            'insurance_expenses',
            'service_expenses',
            'general_expenses',
            'reminders',
            'vehicle_documents',
            'service_parts'
        ] loop
            if not exists (
                select 1 from pg_publication_tables
                where pubname = 'powersync'
                  and schemaname = 'public'
                  and tablename = table_name
            ) then
                execute format('alter publication powersync add table public.%I', table_name);
            end if;
        end loop;
    end if;

    if exists (select 1 from pg_roles where rolname = 'powersync_role') then
        execute 'grant select on table public.profiles, public.vehicles, public.fuel_expenses, public.insurance_expenses, public.service_expenses, public.general_expenses, public.reminders, public.vehicle_documents, public.service_parts to powersync_role';
    end if;
end $$;

notify pgrst, 'reload schema';

commit;
