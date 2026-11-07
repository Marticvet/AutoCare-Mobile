-- Deletion tombstones survive removal of auth.users and deliberately have no
-- foreign key to auth.users. They are the minimum durable state needed to
-- prevent a delayed RevenueCat event from recreating a deleted customer.

begin;

create table if not exists public.revenuecat_deletion_tombstones (
    app_user_id uuid primary key,
    created_at timestamptz not null default now(),
    auth_deleted_at timestamptz
);

create table if not exists public.revenuecat_deletion_requests (
    id uuid primary key default gen_random_uuid(),
    app_user_id uuid not null unique references public.revenuecat_deletion_tombstones(app_user_id),
    status text not null default 'awaiting_auth_deletion'
        check (status in ('awaiting_auth_deletion', 'queued', 'processing', 'requested', 'confirmed', 'failed')),
    attempt_count integer not null default 0 check (attempt_count >= 0),
    last_attempt_at timestamptz,
    next_attempt_at timestamptz not null default now(),
    locked_until timestamptz,
    revenuecat_requested_at timestamptz,
    confirmed_at timestamptz,
    last_error_code text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists revenuecat_deletion_requests_due_idx
    on public.revenuecat_deletion_requests (next_attempt_at)
    where status in ('queued', 'requested');

create index if not exists revenuecat_deletion_requests_stale_locks_idx
    on public.revenuecat_deletion_requests (locked_until)
    where status = 'processing';

alter table public.revenuecat_deletion_requests enable row level security;
alter table public.revenuecat_deletion_tombstones enable row level security;
revoke all on table public.revenuecat_deletion_requests from anon, authenticated;
revoke all on table public.revenuecat_deletion_tombstones from anon, authenticated;

create or replace function public.claim_revenuecat_deletion_requests(request_limit integer default 25)
returns table (id uuid, app_user_id uuid, status text, attempt_count integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    return query
    with due as (
        select request.id
        from public.revenuecat_deletion_requests request
        join public.revenuecat_deletion_tombstones tombstone
          on tombstone.app_user_id = request.app_user_id
        where tombstone.auth_deleted_at is not null
          and (
              (request.status in ('queued', 'requested') and request.next_attempt_at <= now())
              or (request.status = 'processing' and request.locked_until <= now())
          )
        order by request.next_attempt_at asc nulls last
        limit least(greatest(coalesce(request_limit, 25), 1), 100)
        for update skip locked
    )
    update public.revenuecat_deletion_requests request
    set
        status = 'processing',
        attempt_count = request.attempt_count + 1,
        last_attempt_at = now(),
        locked_until = now() + interval '5 minutes',
        updated_at = now()
    from due
    where request.id = due.id
    returning request.id, request.app_user_id, request.status, request.attempt_count;
end;
$$;

revoke all on function public.claim_revenuecat_deletion_requests(integer) from public;
grant execute on function public.claim_revenuecat_deletion_requests(integer) to service_role;

commit;
