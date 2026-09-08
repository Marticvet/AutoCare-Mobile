-- Repair reminder uploads after the owner-only and shared-garage RLS migrations.
--
-- Reminder access is scoped by the row's user_id. That value is the garage
-- owner's id for a shared garage, so comparing it only with auth.uid() rejects
-- valid writes from active admins and drivers. Keep the recurrence entitlement
-- check separate from the access check so every reminder write follows one
-- canonical rule.

begin;

alter table public.reminders enable row level security;

revoke all on table public.reminders from anon;
grant select, insert, update, delete on table public.reminders to authenticated;

create or replace function public.reminders_can_write_row(
    target_owner_id uuid,
    repeat_months_value integer,
    repeat_km_value integer
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select target_owner_id is not null
       and public.billing_can_write_owner(target_owner_id)
       and (
           (
               coalesce(repeat_months_value, 0) <= 0
               and coalesce(repeat_km_value, 0) <= 0
           )
           or public.billing_owner_has_plus(target_owner_id)
       )
$$;

revoke all on function public.reminders_can_write_row(uuid, integer, integer) from public;
grant execute on function public.reminders_can_write_row(uuid, integer, integer) to authenticated;

-- Replace only policies created by this repository. Any separately managed
-- policy in the linked project is intentionally left untouched.
drop policy if exists "reminders_owner_all" on public.reminders;
drop policy if exists "reminders_owner_select" on public.reminders;
drop policy if exists "reminders_owner_insert" on public.reminders;
drop policy if exists "reminders_owner_update" on public.reminders;
drop policy if exists "reminders_owner_delete" on public.reminders;

create policy "reminders_owner_select" on public.reminders
    for select to authenticated
    using (public.billing_can_read_owner(user_id));

create policy "reminders_owner_insert" on public.reminders
    for insert to authenticated
    with check (
        public.reminders_can_write_row(user_id, repeat_months, repeat_km)
    );

create policy "reminders_owner_update" on public.reminders
    for update to authenticated
    using (public.billing_can_write_owner(user_id))
    with check (
        public.reminders_can_write_row(user_id, repeat_months, repeat_km)
    );

create policy "reminders_owner_delete" on public.reminders
    for delete to authenticated
    using (public.billing_can_write_owner(user_id));

notify pgrst, 'reload schema';

commit;
