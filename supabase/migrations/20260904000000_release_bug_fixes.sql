-- Release fixes for expense time retention and trusted administrator garages.

begin;

alter table public.insurance_expenses
    add column if not exists time time;

-- Administrator accounts inherit Family sharing. Reconcile an existing garage
-- in case it was created before administrator access was assigned.
update public.garages garage
set kind = 'family',
    seat_limit = greatest(garage.seat_limit, 6),
    updated_at = now()
where garage.kind <> 'fleet'
  and public.billing_owner_has_family(garage.owner_user_id);

notify pgrst, 'reload schema';

commit;
