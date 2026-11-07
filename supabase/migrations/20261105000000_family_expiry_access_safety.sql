-- Keep Family membership history for renewal, while immediately removing
-- former members' access to shared-garage metadata when Family is no longer
-- current. The existing data-table RLS already calls billing_can_read_owner /
-- billing_can_write_owner; these companion helpers protect garage metadata
-- and member-management operations as well.

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
          and garage.status = 'active'
          and member.user_id = (select auth.uid())
          and member.status = 'active'
          and member.role in ('owner', 'admin')
          and (
              (garage.kind = 'family' and public.billing_owner_has_family(target_owner_id))
              or (garage.kind = 'fleet' and public.billing_owner_has_fleet(target_owner_id))
          )
    )
$$;

create or replace function public.billing_can_view_garage(target_garage_id uuid, target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select target_owner_id = (select auth.uid())
        or public.billing_can_read_owner(target_owner_id)
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
    select (
            target_user_id = (select auth.uid())
            or target_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
        )
        and exists (
            select 1
            from public.garages garage
            where garage.id = target_garage_id
              and garage.status = 'active'
              and (
                  garage.owner_user_id = (select auth.uid())
                  or (garage.kind = 'family' and public.billing_owner_has_family(garage.owner_user_id))
                  or (garage.kind = 'fleet' and public.billing_owner_has_fleet(garage.owner_user_id))
              )
        )
        or exists (
            select 1
            from public.garages garage
            where garage.id = target_garage_id
              and public.billing_can_read_owner(garage.owner_user_id)
        )
        or exists (
            select 1
            from public.garages garage
            where garage.id = target_garage_id
              and public.billing_can_admin_owner(garage.owner_user_id)
        )
$$;

notify pgrst, 'reload schema';

commit;
