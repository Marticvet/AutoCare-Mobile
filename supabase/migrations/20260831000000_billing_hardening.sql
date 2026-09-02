-- Close paid-feature bypasses after the initial billing migration.

begin;

-- An upsert of an already-owned vehicle must remain possible for Free users;
-- only a genuinely new second vehicle is restricted.
create or replace function public.billing_can_insert_vehicle(
    target_user_id uuid,
    target_vehicle_id uuid
)
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
        select 1 from public.vehicles
        where user_id = target_user_id and id = target_vehicle_id
    ) or (
        select count(*) < 1 from public.vehicles where user_id = target_user_id
    ) or public.billing_has_plus(target_user_id);
end;
$$;

revoke all on function public.billing_can_insert_vehicle(uuid, uuid) from public;
grant execute on function public.billing_can_insert_vehicle(uuid, uuid) to authenticated;

drop policy if exists "vehicles_owner_insert" on public.vehicles;
create policy "vehicles_owner_insert" on public.vehicles
    for insert to authenticated
    with check (
        (select auth.uid()) = user_id
        and public.billing_can_insert_vehicle(user_id, id)
    );

-- Serialize new vehicle inserts per user. This prevents two concurrent offline
-- uploads from both passing the one-Free-vehicle count check.
create or replace function public.enforce_vehicle_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    -- Direct trusted SQL/service work has no end-user JWT; RLS still protects
    -- authenticated client requests before this trigger runs.
    if (select auth.uid()) is null then
        return new;
    end if;
    if new.user_id is distinct from (select auth.uid()) then
        raise exception 'Vehicle owner does not match the authenticated user.' using errcode = '42501';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
    if not public.billing_has_plus(new.user_id) and exists (
        select 1 from public.vehicles
        where user_id = new.user_id and id <> new.id
    ) then
        raise exception 'AutoCare Plus is required for more than one vehicle.' using errcode = '42501';
    end if;
    return new;
end;
$$;

revoke all on function public.enforce_vehicle_plan_limit() from public;
drop trigger if exists enforce_vehicle_plan_limit on public.vehicles;
create trigger enforce_vehicle_plan_limit
    before insert on public.vehicles
    for each row execute function public.enforce_vehicle_plan_limit();

-- Storage object writes must be protected as well as the document metadata.
-- Reading and deletion remain owner-accessible after a subscription expires.
drop policy if exists "vehicle_document_files_insert" on storage.objects;
drop policy if exists "vehicle_document_files_update" on storage.objects;

create policy "vehicle_document_files_insert" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'vehicle-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
        and public.billing_has_plus(auth.uid())
    );

create policy "vehicle_document_files_update" on storage.objects
    for update to authenticated
    using (
        bucket_id = 'vehicle-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
        and public.billing_has_plus(auth.uid())
    )
    with check (
        bucket_id = 'vehicle-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
        and public.billing_has_plus(auth.uid())
    );

notify pgrst, 'reload schema';

commit;
