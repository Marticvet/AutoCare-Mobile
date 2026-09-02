-- PowerSync requires every synced table to expose a primary key named `id`.
-- Fleet billing continues to use garage_id as its stable one-to-one key.

begin;

alter table public.fleet_billing_accounts
    add column if not exists id uuid not null default gen_random_uuid();

alter table public.fleet_billing_accounts
    drop constraint if exists fleet_billing_accounts_pkey;

alter table public.fleet_billing_accounts
    add constraint fleet_billing_accounts_pkey primary key (id);

alter table public.fleet_billing_accounts
    drop constraint if exists fleet_billing_accounts_garage_id_key;

alter table public.fleet_billing_accounts
    add constraint fleet_billing_accounts_garage_id_key unique (garage_id);

notify pgrst, 'reload schema';

commit;
