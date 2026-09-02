-- AutoCare productivity features: precise expense locations, EV charging,
-- ownership budgets, trip logs, scheduled reports, and fleet checklists.
-- Domain rows continue to use user_id as the garage owner so they inherit the
-- Family/Fleet access model introduced by 20260901000000_membership_tiers.sql.

begin;

alter table public.fuel_expenses
    add column if not exists latitude numeric(9, 6),
    add column if not exists longitude numeric(9, 6),
    add column if not exists import_batch_id uuid,
    add column if not exists external_id text;

alter table public.service_expenses
    add column if not exists latitude numeric(9, 6),
    add column if not exists longitude numeric(9, 6),
    add column if not exists import_batch_id uuid,
    add column if not exists external_id text;

alter table public.insurance_expenses
    add column if not exists location_name text,
    add column if not exists latitude numeric(9, 6),
    add column if not exists longitude numeric(9, 6),
    add column if not exists import_batch_id uuid,
    add column if not exists external_id text;

alter table public.general_expenses
    add column if not exists location_name text,
    add column if not exists latitude numeric(9, 6),
    add column if not exists longitude numeric(9, 6),
    add column if not exists import_batch_id uuid,
    add column if not exists external_id text;

alter table public.reminders
    add column if not exists notify_before_minutes integer not null default 0
        check (notify_before_minutes between 0 and 525600),
    add column if not exists notification_title text,
    add column if not exists notification_body text;

create table if not exists public.charging_expenses (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    selected_vehicle_id uuid not null references public.vehicles(id) on delete cascade,
    energy_kwh numeric(12, 3) not null check (energy_kwh > 0),
    price_per_kwh numeric(12, 4) check (price_per_kwh is null or price_per_kwh >= 0),
    total_cost numeric(12, 2) not null check (total_cost >= 0),
    battery_start_percent numeric(5, 2) check (battery_start_percent is null or battery_start_percent between 0 and 100),
    battery_end_percent numeric(5, 2) check (battery_end_percent is null or battery_end_percent between 0 and 100),
    charger_type text,
    charging_speed_kw numeric(10, 2) check (charging_speed_kw is null or charging_speed_kw > 0),
    efficiency_kwh_per_100km numeric(10, 3)
        check (efficiency_kwh_per_100km is null or efficiency_kwh_per_100km > 0),
    odometer integer check (odometer is null or odometer >= 0),
    date date not null default current_date,
    time time,
    location_name text,
    latitude numeric(9, 6),
    longitude numeric(9, 6),
    payment_method text,
    notes text,
    import_batch_id uuid,
    external_id text,
    created_at timestamptz not null default now()
);

create table if not exists public.vehicle_budgets (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    vehicle_id uuid not null references public.vehicles(id) on delete cascade,
    monthly_budget numeric(12, 2) check (monthly_budget is null or monthly_budget >= 0),
    purchase_price numeric(12, 2) check (purchase_price is null or purchase_price >= 0),
    current_value numeric(12, 2) check (current_value is null or current_value >= 0),
    purchase_date date,
    annual_depreciation_percent numeric(6, 3)
        check (annual_depreciation_percent is null or annual_depreciation_percent between 0 and 100),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, vehicle_id)
);

create table if not exists public.trips (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    vehicle_id uuid not null references public.vehicles(id) on delete cascade,
    purpose text not null default 'personal'
        check (purpose in ('business', 'personal', 'commute', 'other')),
    title text,
    start_at timestamptz not null,
    end_at timestamptz,
    start_odometer integer check (start_odometer is null or start_odometer >= 0),
    end_odometer integer check (end_odometer is null or end_odometer >= 0),
    distance_km numeric(12, 3) not null default 0 check (distance_km >= 0),
    origin text,
    destination text,
    origin_latitude numeric(9, 6),
    origin_longitude numeric(9, 6),
    destination_latitude numeric(9, 6),
    destination_longitude numeric(9, 6),
    reimbursable_rate numeric(12, 4) check (reimbursable_rate is null or reimbursable_rate >= 0),
    notes text,
    created_at timestamptz not null default now()
);

create table if not exists public.report_schedules (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    vehicle_id uuid references public.vehicles(id) on delete cascade,
    name text not null,
    frequency text not null check (frequency in ('weekly', 'monthly')),
    format text not null check (format in ('csv', 'pdf')),
    delivery_email text not null,
    day_of_week integer check (day_of_week is null or day_of_week between 0 and 6),
    day_of_month integer check (day_of_month is null or day_of_month between 1 and 28),
    delivery_time time not null default '09:00',
    timezone text not null default 'UTC',
    enabled integer not null default 1 check (enabled in (0, 1)),
    next_run_at timestamptz,
    last_sent_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.checklist_templates (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    name text not null,
    description text,
    vehicle_type text,
    is_default integer not null default 0 check (is_default in (0, 1)),
    active integer not null default 1 check (active in (0, 1)),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.checklist_template_items (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    template_id uuid not null references public.checklist_templates(id) on delete cascade,
    label text not null,
    required integer not null default 1 check (required in (0, 1)),
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists public.checklist_runs (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    template_id uuid references public.checklist_templates(id) on delete set null,
    vehicle_id uuid not null references public.vehicles(id) on delete cascade,
    assigned_user_id uuid references auth.users(id) on delete set null,
    status text not null default 'in_progress'
        check (status in ('in_progress', 'passed', 'attention_required')),
    driver_name text,
    damage_notes text,
    signature_name text,
    signature_storage_path text,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.checklist_run_items (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    run_id uuid not null references public.checklist_runs(id) on delete cascade,
    template_item_id uuid references public.checklist_template_items(id) on delete set null,
    label text not null,
    result text not null default 'unchecked'
        check (result in ('unchecked', 'pass', 'fail', 'not_applicable')),
    notes text,
    photo_storage_path text,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists charging_expenses_user_vehicle_date_idx
    on public.charging_expenses (user_id, selected_vehicle_id, date desc);
create unique index if not exists charging_expenses_import_identity_idx
    on public.charging_expenses (user_id, external_id) where external_id is not null;
create unique index if not exists fuel_expenses_import_identity_idx
    on public.fuel_expenses (user_id, external_id) where external_id is not null;
create unique index if not exists service_expenses_import_identity_idx
    on public.service_expenses (user_id, external_id) where external_id is not null;
create unique index if not exists insurance_expenses_import_identity_idx
    on public.insurance_expenses (user_id, external_id) where external_id is not null;
create unique index if not exists general_expenses_import_identity_idx
    on public.general_expenses (user_id, external_id) where external_id is not null;
create index if not exists vehicle_budgets_user_vehicle_idx
    on public.vehicle_budgets (user_id, vehicle_id);
create index if not exists trips_user_vehicle_start_idx
    on public.trips (user_id, vehicle_id, start_at desc);
create index if not exists report_schedules_due_idx
    on public.report_schedules (enabled, next_run_at) where enabled = 1;
create index if not exists checklist_templates_user_active_idx
    on public.checklist_templates (user_id, active);
create index if not exists checklist_template_items_template_idx
    on public.checklist_template_items (template_id, sort_order);
create index if not exists checklist_runs_user_vehicle_idx
    on public.checklist_runs (user_id, vehicle_id, started_at desc);
create index if not exists checklist_run_items_run_idx
    on public.checklist_run_items (run_id, sort_order);

do $$
declare sync_table text;
begin
    if exists (select 1 from pg_publication where pubname = 'powersync') then
        foreach sync_table in array array[
            'charging_expenses', 'vehicle_budgets', 'trips', 'report_schedules',
            'checklist_templates', 'checklist_template_items', 'checklist_runs',
            'checklist_run_items'
        ] loop
            if not exists (
                select 1 from pg_publication_tables
                where pubname = 'powersync' and schemaname = 'public' and tablename = sync_table
            ) then
                execute format('alter publication powersync add table public.%I', sync_table);
            end if;
        end loop;
    end if;
end $$;

alter table public.charging_expenses enable row level security;
alter table public.vehicle_budgets enable row level security;
alter table public.trips enable row level security;
alter table public.report_schedules enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_template_items enable row level security;
alter table public.checklist_runs enable row level security;
alter table public.checklist_run_items enable row level security;

do $$
declare secured_table text;
begin
    foreach secured_table in array array[
        'charging_expenses', 'vehicle_budgets', 'trips', 'report_schedules',
        'checklist_templates', 'checklist_template_items', 'checklist_runs',
        'checklist_run_items'
    ] loop
        execute format('revoke all on public.%I from anon', secured_table);
        execute format('grant select, insert, update, delete on public.%I to authenticated', secured_table);
        execute format('drop policy if exists %I on public.%I', secured_table || '_read', secured_table);
        execute format('drop policy if exists %I on public.%I', secured_table || '_write', secured_table);
        execute format(
            'create policy %I on public.%I for select to authenticated using (public.billing_can_read_owner(user_id))',
            secured_table || '_read', secured_table
        );
        execute format(
            'create policy %I on public.%I for all to authenticated using (public.billing_can_write_owner(user_id)) with check (public.billing_can_write_owner(user_id))',
            secured_table || '_write', secured_table
        );
    end loop;
end $$;

commit;
