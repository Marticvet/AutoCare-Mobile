-- Emergency rollback source for 20261105000000_family_expiry_access_safety.sql.
-- DO NOT place this file in supabase/migrations or run it directly. If a
-- rollback is approved, copy it into a newly generated, timestamped migration
-- after confirming the live function bodies and the reason for rollback.
-- This restores the pre-fix behaviour and therefore reopens the expired-member
-- metadata exposure; it is not a normal operational rollback.

begin;

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

notify pgrst, 'reload schema';

commit;
