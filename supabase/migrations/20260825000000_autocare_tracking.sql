-- AutoCare Hub offline-first tracking model.
-- Apply through the Supabase CLI or SQL editor before deploying the matching
-- PowerSync stream configuration.

alter table if exists public.profiles
    add column if not exists account_type text not null default 'individual';

alter table if exists public.fuel_expenses
    add column if not exists date date,
    add column if not exists time time,
    add column if not exists created_at timestamptz not null default now();

alter table if exists public.insurance_expenses
    add column if not exists provider text,
    add column if not exists payment_method text,
    add column if not exists created_at timestamptz not null default now();

alter table if exists public.service_expenses
    add column if not exists created_at timestamptz not null default now();

-- The client stores booleans as "0"/"1" text so SQLite, Supabase and
-- PowerSync agree on one representation across native platforms.
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'fuel_expenses'
          and column_name = 'full_tank' and data_type <> 'text'
    ) then
        execute 'alter table public.fuel_expenses alter column full_tank drop default';
        execute $sql$
            alter table public.fuel_expenses alter column full_tank type text
            using case
                when full_tank::text in ('true', 't', '1') then '1'
                else '0'
            end
        $sql$;
        execute 'alter table public.fuel_expenses alter column full_tank set default ''0''';
    end if;
end $$;

create table if not exists public.general_expenses (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    vehicle_id uuid not null references public.vehicles(id) on delete cascade,
    category text not null default 'other',
    title text,
    amount numeric(12, 2) not null check (amount >= 0),
    odometer integer check (odometer is null or odometer >= 0),
    date date not null default current_date,
    time time,
    place text,
    payment_method text,
    notes text,
    tags text,
    created_at timestamptz not null default now()
);

create table if not exists public.reminders (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    vehicle_id uuid not null references public.vehicles(id) on delete cascade,
    title text not null,
    category text not null default 'custom',
    due_date date,
    due_mileage integer check (due_mileage is null or due_mileage >= 0),
    repeat_months integer check (repeat_months is null or repeat_months > 0),
    repeat_km integer check (repeat_km is null or repeat_km > 0),
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
    status text not null default 'active' check (status in ('active', 'completed')),
    notes text,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    related_document_id uuid
);

create table if not exists public.vehicle_documents (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    vehicle_id uuid not null references public.vehicles(id) on delete cascade,
    title text not null,
    category text not null default 'other',
    file_name text,
    mime_type text,
    file_size bigint check (file_size is null or file_size >= 0),
    storage_path text,
    remote_url text,
    expiration_date date,
    notes text,
    created_at timestamptz not null default now(),
    related_expense_id uuid,
    related_expense_type text
);

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'reminders_related_document_id_fkey'
          and conrelid = 'public.reminders'::regclass
    ) then
        alter table public.reminders
            add constraint reminders_related_document_id_fkey
            foreign key (related_document_id) references public.vehicle_documents(id) on delete cascade;
    end if;
end $$;

create table if not exists public.service_parts (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    vehicle_id uuid not null references public.vehicles(id) on delete cascade,
    service_expense_id uuid not null references public.service_expenses(id) on delete cascade,
    name text not null,
    part_number text,
    quantity numeric(10, 2) not null default 1 check (quantity > 0),
    unit_cost numeric(12, 2) not null default 0 check (unit_cost >= 0),
    installed_at_mileage integer check (installed_at_mileage is null or installed_at_mileage >= 0),
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists general_expenses_user_vehicle_date_idx
    on public.general_expenses (user_id, vehicle_id, date desc);
create index if not exists reminders_user_vehicle_status_idx
    on public.reminders (user_id, vehicle_id, status, due_date);
create index if not exists vehicle_documents_user_vehicle_expiry_idx
    on public.vehicle_documents (user_id, vehicle_id, expiration_date);
create index if not exists service_parts_user_service_idx
    on public.service_parts (user_id, service_expense_id);

alter table public.general_expenses enable row level security;
alter table public.reminders enable row level security;
alter table public.vehicle_documents enable row level security;
alter table public.service_parts enable row level security;

drop policy if exists "general_expenses_owner_all" on public.general_expenses;
drop policy if exists "reminders_owner_all" on public.reminders;
drop policy if exists "vehicle_documents_owner_all" on public.vehicle_documents;
drop policy if exists "service_parts_owner_all" on public.service_parts;

create policy "general_expenses_owner_all" on public.general_expenses
    for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reminders_owner_all" on public.reminders
    for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vehicle_documents_owner_all" on public.vehicle_documents
    for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "service_parts_owner_all" on public.service_parts
    for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ensure a profile exists even when email confirmation means the client does
-- not receive an authenticated session immediately after sign-up.
create or replace function public.handle_new_autocare_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name, first_name, last_name, updated_at, account_type)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data ->> 'full_name', ''),
        split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1),
        trim(substr(coalesce(new.raw_user_meta_data ->> 'full_name', ''), length(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1)) + 1)),
        now(),
        'individual'
    )
    on conflict (id) do update set
        email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
        updated_at = now();
    return new;
end;
$$;

drop trigger if exists on_auth_user_created_autocare on auth.users;
create trigger on_auth_user_created_autocare
    after insert on auth.users
    for each row execute procedure public.handle_new_autocare_user();

insert into storage.buckets (id, name, public, file_size_limit)
values ('vehicle-documents', 'vehicle-documents', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "vehicle_document_files_read" on storage.objects;
drop policy if exists "vehicle_document_files_insert" on storage.objects;
drop policy if exists "vehicle_document_files_update" on storage.objects;
drop policy if exists "vehicle_document_files_delete" on storage.objects;

create policy "vehicle_document_files_read" on storage.objects
    for select to authenticated
    using (bucket_id = 'vehicle-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vehicle_document_files_insert" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'vehicle-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vehicle_document_files_update" on storage.objects
    for update to authenticated
    using (bucket_id = 'vehicle-documents' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'vehicle-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vehicle_document_files_delete" on storage.objects
    for delete to authenticated
    using (bucket_id = 'vehicle-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Add only missing tables to an existing PowerSync publication. PowerSync
-- Cloud commonly creates this publication during the Supabase setup flow.
do $$
declare
    table_name text;
begin
    if exists (select 1 from pg_publication where pubname = 'powersync') then
        foreach table_name in array array[
            'general_expenses', 'reminders', 'vehicle_documents', 'service_parts'
        ] loop
            if not exists (
                select 1 from pg_publication_tables
                where pubname = 'powersync' and schemaname = 'public' and tablename = table_name
            ) then
                execute format('alter publication powersync add table public.%I', table_name);
            end if;
        end loop;
    end if;
end $$;
