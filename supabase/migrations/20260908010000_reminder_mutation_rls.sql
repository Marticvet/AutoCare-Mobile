-- Allow authorized reminder mutations independently from subscription state.
--
-- Completing a recurring reminder writes two rows through PowerSync: it updates
-- the completed occurrence and inserts the next occurrence. RLS is the data
-- authorization boundary and must answer whether the current user may write the
-- garage owner's rows. Product-tier checks belong to the reminder creation UI;
-- mixing them into WITH CHECK made valid edits/completions permanently block the
-- PowerSync upload queue when billing state changed or had not synchronized yet.

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
    -- Keep the existing function signature because deployed clients use it for
    -- diagnostics. Recurrence values do not affect row-level authorization.
    select target_owner_id is not null
       and public.billing_can_write_owner(target_owner_id)
$$;

revoke all on function public.reminders_can_write_row(uuid, integer, integer) from public;
grant execute on function public.reminders_can_write_row(uuid, integer, integer) to authenticated;

drop policy if exists "reminders_owner_insert" on public.reminders;
create policy "reminders_owner_insert" on public.reminders
    for insert to authenticated
    with check (public.billing_can_write_owner(user_id));

drop policy if exists "reminders_owner_update" on public.reminders;
create policy "reminders_owner_update" on public.reminders
    for update to authenticated
    using (public.billing_can_write_owner(user_id))
    with check (public.billing_can_write_owner(user_id));

notify pgrst, 'reload schema';

commit;
