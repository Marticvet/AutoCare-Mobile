-- Bring the existing Supabase project in line with the mobile PowerSync schema.
-- This migration is additive and safe to run more than once.

begin;

-- These fields are written by the vehicle form but were missing from the live
-- Supabase table, causing PostgREST error 42703 and blocking the upload queue.
alter table public.vehicles
    add column if not exists vehicle_year_of_manufacture integer,
    add column if not exists vehicle_identification_number text;

update public.vehicles
set vehicle_year_of_manufacture = vehicle_model_year
where vehicle_year_of_manufacture is null
  and vehicle_model_year is not null;

-- RLS and grants are both required: grants allow authenticated requests to
-- reach PostgREST, while the policies isolate every user's rows.
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.fuel_expenses enable row level security;
alter table public.insurance_expenses enable row level security;
alter table public.service_expenses enable row level security;
alter table public.general_expenses enable row level security;
alter table public.reminders enable row level security;
alter table public.vehicle_documents enable row level security;
alter table public.service_parts enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.vehicles from anon, authenticated;
revoke all on table public.fuel_expenses from anon, authenticated;
revoke all on table public.insurance_expenses from anon, authenticated;
revoke all on table public.service_expenses from anon, authenticated;
revoke all on table public.general_expenses from anon, authenticated;
revoke all on table public.reminders from anon, authenticated;
revoke all on table public.vehicle_documents from anon, authenticated;
revoke all on table public.service_parts from anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.vehicles to authenticated;
grant select, insert, update, delete on table public.fuel_expenses to authenticated;
grant select, insert, update, delete on table public.insurance_expenses to authenticated;
grant select, insert, update, delete on table public.service_expenses to authenticated;
grant select, insert, update, delete on table public.general_expenses to authenticated;
grant select, insert, update, delete on table public.reminders to authenticated;
grant select, insert, update, delete on table public.vehicle_documents to authenticated;
grant select, insert, update, delete on table public.service_parts to authenticated;

-- Profiles use their primary key as the owner id.
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

-- All remaining synchronized tables use user_id as the owner id.
drop policy if exists "vehicles_owner_select" on public.vehicles;
drop policy if exists "vehicles_owner_insert" on public.vehicles;
drop policy if exists "vehicles_owner_update" on public.vehicles;
drop policy if exists "vehicles_owner_delete" on public.vehicles;
create policy "vehicles_owner_select" on public.vehicles
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "vehicles_owner_insert" on public.vehicles
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "vehicles_owner_update" on public.vehicles
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy "vehicles_owner_delete" on public.vehicles
    for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "fuel_expenses_owner_select" on public.fuel_expenses;
drop policy if exists "fuel_expenses_owner_insert" on public.fuel_expenses;
drop policy if exists "fuel_expenses_owner_update" on public.fuel_expenses;
drop policy if exists "fuel_expenses_owner_delete" on public.fuel_expenses;
create policy "fuel_expenses_owner_select" on public.fuel_expenses
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "fuel_expenses_owner_insert" on public.fuel_expenses
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "fuel_expenses_owner_update" on public.fuel_expenses
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy "fuel_expenses_owner_delete" on public.fuel_expenses
    for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "insurance_expenses_owner_select" on public.insurance_expenses;
drop policy if exists "insurance_expenses_owner_insert" on public.insurance_expenses;
drop policy if exists "insurance_expenses_owner_update" on public.insurance_expenses;
drop policy if exists "insurance_expenses_owner_delete" on public.insurance_expenses;
create policy "insurance_expenses_owner_select" on public.insurance_expenses
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "insurance_expenses_owner_insert" on public.insurance_expenses
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "insurance_expenses_owner_update" on public.insurance_expenses
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy "insurance_expenses_owner_delete" on public.insurance_expenses
    for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "service_expenses_owner_select" on public.service_expenses;
drop policy if exists "service_expenses_owner_insert" on public.service_expenses;
drop policy if exists "service_expenses_owner_update" on public.service_expenses;
drop policy if exists "service_expenses_owner_delete" on public.service_expenses;
create policy "service_expenses_owner_select" on public.service_expenses
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "service_expenses_owner_insert" on public.service_expenses
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "service_expenses_owner_update" on public.service_expenses
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy "service_expenses_owner_delete" on public.service_expenses
    for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "general_expenses_owner_select" on public.general_expenses;
drop policy if exists "general_expenses_owner_insert" on public.general_expenses;
drop policy if exists "general_expenses_owner_update" on public.general_expenses;
drop policy if exists "general_expenses_owner_delete" on public.general_expenses;
create policy "general_expenses_owner_select" on public.general_expenses
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "general_expenses_owner_insert" on public.general_expenses
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "general_expenses_owner_update" on public.general_expenses
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy "general_expenses_owner_delete" on public.general_expenses
    for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "reminders_owner_select" on public.reminders;
drop policy if exists "reminders_owner_insert" on public.reminders;
drop policy if exists "reminders_owner_update" on public.reminders;
drop policy if exists "reminders_owner_delete" on public.reminders;
create policy "reminders_owner_select" on public.reminders
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "reminders_owner_insert" on public.reminders
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "reminders_owner_update" on public.reminders
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy "reminders_owner_delete" on public.reminders
    for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "vehicle_documents_owner_select" on public.vehicle_documents;
drop policy if exists "vehicle_documents_owner_insert" on public.vehicle_documents;
drop policy if exists "vehicle_documents_owner_update" on public.vehicle_documents;
drop policy if exists "vehicle_documents_owner_delete" on public.vehicle_documents;
create policy "vehicle_documents_owner_select" on public.vehicle_documents
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "vehicle_documents_owner_insert" on public.vehicle_documents
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "vehicle_documents_owner_update" on public.vehicle_documents
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy "vehicle_documents_owner_delete" on public.vehicle_documents
    for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "service_parts_owner_select" on public.service_parts;
drop policy if exists "service_parts_owner_insert" on public.service_parts;
drop policy if exists "service_parts_owner_update" on public.service_parts;
drop policy if exists "service_parts_owner_delete" on public.service_parts;
create policy "service_parts_owner_select" on public.service_parts
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "service_parts_owner_insert" on public.service_parts
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "service_parts_owner_update" on public.service_parts
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy "service_parts_owner_delete" on public.service_parts
    for delete to authenticated using ((select auth.uid()) = user_id);

-- PowerSync reads changes through the publication, independently from the RLS
-- used by mobile uploads. Add every synchronized table when the publication
-- created by the PowerSync setup flow is available.
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
                select 1
                from pg_publication_tables
                where pubname = 'powersync'
                  and schemaname = 'public'
                  and tablename = table_name
            ) then
                execute format('alter publication powersync add table public.%I', table_name);
            end if;
        end loop;
    else
        raise warning 'PowerSync publication is missing. Complete the PowerSync Supabase source setup.';
    end if;

    if exists (select 1 from pg_roles where rolname = 'powersync_role') then
        execute 'grant select on table public.profiles, public.vehicles, public.fuel_expenses, public.insurance_expenses, public.service_expenses, public.general_expenses, public.reminders, public.vehicle_documents, public.service_parts to powersync_role';
    end if;
end $$;

-- Refresh PostgREST immediately instead of waiting for its schema cache.
notify pgrst, 'reload schema';

commit;
