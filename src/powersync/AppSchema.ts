import { column, Schema, Table } from "@powersync/react-native";

export const VEHICLES_TABLE = "vehicles";
export const TODOS_TABLE = "todos";
export const PROFILES_TABLE = "profiles";
export const FUEL_EXPENSES_TABLE = "fuel_expenses";
export const INSURANCE_EXPENSES_TABLE = "insurance_expenses";
export const SERVICE_EXPENSES_TABLE = "service_expenses";
export const GENERAL_EXPENSES_TABLE = "general_expenses";
export const REMINDERS_TABLE = "reminders";
export const DOCUMENTS_TABLE = "vehicle_documents";
export const SERVICE_PARTS_TABLE = "service_parts";
export const GARAGES_TABLE = "garages";
export const GARAGE_MEMBERSHIPS_TABLE = "garage_memberships";
export const FLEET_BILLING_ACCOUNTS_TABLE = "fleet_billing_accounts";
export const CHARGING_EXPENSES_TABLE = "charging_expenses";
export const VEHICLE_BUDGETS_TABLE = "vehicle_budgets";
export const TRIPS_TABLE = "trips";
export const REPORT_SCHEDULES_TABLE = "report_schedules";
export const CHECKLIST_TEMPLATES_TABLE = "checklist_templates";
export const CHECKLIST_TEMPLATE_ITEMS_TABLE = "checklist_template_items";
export const CHECKLIST_RUNS_TABLE = "checklist_runs";
export const CHECKLIST_RUN_ITEMS_TABLE = "checklist_run_items";

const vehicles = new Table(
    {
        id: column.text,
        created_at: column.text,
        vehicle_brand: column.text,
        vehicle_car_type: column.text,
        vehicle_identification_number: column.text,
        vehicle_license_plate: column.text,
        vehicle_model: column.text,
        vehicle_trim: column.text,
        vehicle_fuel_type: column.text,
        vehicle_model_year: column.integer,
        vehicle_year_of_manufacture: column.integer,
        current_mileage: column.integer,
        user_id: column.text,
    },
    { indexes: { vehicle: ["id"] } }
);

const todos = new Table(
    {
        list_id: column.text,
        photo_id: column.text,
        created_at: column.text,
        completed_at: column.text,
        description: column.text,
        created_by: column.text,
        completed_by: column.text,
        completed: column.integer,
    },
    { indexes: { list: ["list_id"] } }
);

const profiles = new Table({
    id: column.text, // UUID as string
    updated_at: column.text,
    email: column.text,
    avatar_url: column.text,
    first_name: column.text,
    last_name: column.text,
    selected_vehicle_id: column.text,
    phone_number: column.text,
    phone_country_code: column.text,
    username: column.text,
    full_name: column.text,
    account_type: column.text,
});

const fuel_expenses = new Table({
    id: column.text,
    odometer: column.integer,
    fuel_type: column.text,
    price_liter: column.real,
    total_cost: column.real,
    total_litres: column.real,
    full_tank: column.text,
    gas_station: column.text,
    payment_method: column.text,
    notes: column.text,
    selected_vehicle_id: column.text,
    user_id: column.text,
    date: column.text, // ISO string
    time: column.text,
    location_name: column.text,
    latitude: column.real,
    longitude: column.real,
    import_batch_id: column.text,
    external_id: column.text,
    created_at: column.text,
});

const insurance_expenses = new Table({
    id: column.text,
    odometer: column.integer,
    cost: column.real,
    valid_from: column.text,
    valid_to: column.text,
    notes: column.text,
    user_id: column.text,
    selected_vehicle_id: column.text,
    provider: column.text,
    payment_method: column.text,
    location_name: column.text,
    latitude: column.real,
    longitude: column.real,
    import_batch_id: column.text,
    external_id: column.text,
    created_at: column.text,
});

const service_expenses = new Table({
    id: column.text,
    type_of_service: column.text,
    cost: column.real,
    place: column.text,
    payment_method: column.text,
    notes: column.text,
    selected_vehicle_id: column.text,
    user_id: column.text,
    date: column.text,
    time: column.text,
    odometer: column.integer,
    location_name: column.text,
    latitude: column.real,
    longitude: column.real,
    import_batch_id: column.text,
    external_id: column.text,
    created_at: column.text,
});

const general_expenses = new Table(
    {
        id: column.text,
        user_id: column.text,
        vehicle_id: column.text,
        category: column.text,
        title: column.text,
        amount: column.real,
        odometer: column.integer,
        date: column.text,
        time: column.text,
        place: column.text,
        location_name: column.text,
        latitude: column.real,
        longitude: column.real,
        payment_method: column.text,
        notes: column.text,
        tags: column.text,
        import_batch_id: column.text,
        external_id: column.text,
        created_at: column.text,
    },
    { indexes: { general_expense_vehicle: ["vehicle_id", "date"] } }
);

const reminders = new Table(
    {
        id: column.text,
        user_id: column.text,
        vehicle_id: column.text,
        title: column.text,
        category: column.text,
        due_date: column.text,
        due_time: column.text,
        due_mileage: column.integer,
        repeat_months: column.integer,
        repeat_km: column.integer,
        priority: column.text,
        status: column.text,
        notes: column.text,
        completed_at: column.text,
        created_at: column.text,
        related_document_id: column.text,
        notify_before_minutes: column.integer,
        notification_title: column.text,
        notification_body: column.text,
    },
    { indexes: { reminder_vehicle: ["vehicle_id", "status"] } }
);

const vehicle_documents = new Table(
    {
        id: column.text,
        user_id: column.text,
        vehicle_id: column.text,
        title: column.text,
        category: column.text,
        file_name: column.text,
        mime_type: column.text,
        file_size: column.integer,
        storage_path: column.text,
        remote_url: column.text,
        expiration_date: column.text,
        notes: column.text,
        created_at: column.text,
        related_expense_id: column.text,
        related_expense_type: column.text,
    },
    { indexes: { document_vehicle: ["vehicle_id", "expiration_date"] } }
);

const service_parts = new Table(
    {
        id: column.text,
        user_id: column.text,
        vehicle_id: column.text,
        service_expense_id: column.text,
        name: column.text,
        part_number: column.text,
        quantity: column.real,
        unit_cost: column.real,
        installed_at_mileage: column.integer,
        notes: column.text,
        created_at: column.text,
    },
    { indexes: { service_part_expense: ["service_expense_id"] } }
);

const garages = new Table(
    {
        owner_user_id: column.text,
        name: column.text,
        kind: column.text,
        status: column.text,
        seat_limit: column.integer,
        vehicle_limit: column.integer,
        created_at: column.text,
        updated_at: column.text,
    },
    { indexes: { garage_owner: ["owner_user_id"] } }
);

const garage_memberships = new Table(
    {
        garage_id: column.text,
        user_id: column.text,
        email: column.text,
        display_name: column.text,
        role: column.text,
        status: column.text,
        invited_by: column.text,
        accepted_at: column.text,
        created_at: column.text,
        updated_at: column.text,
    },
    { indexes: { membership_garage: ["garage_id", "status"], membership_user: ["user_id", "status"] } }
);

const fleet_billing_accounts = new Table({
    garage_id: column.text,
    stripe_customer_id: column.text,
    stripe_subscription_id: column.text,
    status: column.text,
    licensed_vehicles: column.integer,
    licensed_members: column.integer,
    currency: column.text,
    unit_amount: column.integer,
    current_period_end: column.text,
    created_at: column.text,
    updated_at: column.text,
});

const charging_expenses = new Table(
    {
        user_id: column.text,
        selected_vehicle_id: column.text,
        energy_kwh: column.real,
        price_per_kwh: column.real,
        total_cost: column.real,
        battery_start_percent: column.real,
        battery_end_percent: column.real,
        charger_type: column.text,
        charging_speed_kw: column.real,
        efficiency_kwh_per_100km: column.real,
        odometer: column.integer,
        date: column.text,
        time: column.text,
        location_name: column.text,
        latitude: column.real,
        longitude: column.real,
        payment_method: column.text,
        notes: column.text,
        import_batch_id: column.text,
        external_id: column.text,
        created_at: column.text,
    },
    { indexes: { charging_vehicle: ["selected_vehicle_id", "date"] } }
);

const vehicle_budgets = new Table(
    {
        user_id: column.text,
        vehicle_id: column.text,
        monthly_budget: column.real,
        purchase_price: column.real,
        current_value: column.real,
        purchase_date: column.text,
        annual_depreciation_percent: column.real,
        created_at: column.text,
        updated_at: column.text,
    },
    { indexes: { budget_vehicle: ["vehicle_id"] } }
);

const trips = new Table(
    {
        user_id: column.text,
        vehicle_id: column.text,
        purpose: column.text,
        title: column.text,
        start_at: column.text,
        end_at: column.text,
        start_odometer: column.integer,
        end_odometer: column.integer,
        distance_km: column.real,
        origin: column.text,
        destination: column.text,
        origin_latitude: column.real,
        origin_longitude: column.real,
        destination_latitude: column.real,
        destination_longitude: column.real,
        reimbursable_rate: column.real,
        notes: column.text,
        created_at: column.text,
    },
    { indexes: { trip_vehicle: ["vehicle_id", "start_at"] } }
);

const report_schedules = new Table(
    {
        user_id: column.text,
        vehicle_id: column.text,
        name: column.text,
        frequency: column.text,
        format: column.text,
        delivery_email: column.text,
        day_of_week: column.integer,
        day_of_month: column.integer,
        delivery_time: column.text,
        timezone: column.text,
        enabled: column.integer,
        next_run_at: column.text,
        last_sent_at: column.text,
        created_at: column.text,
        updated_at: column.text,
    },
    { indexes: { report_schedule_user: ["user_id", "enabled"] } }
);

const checklist_templates = new Table(
    {
        user_id: column.text,
        name: column.text,
        description: column.text,
        vehicle_type: column.text,
        is_default: column.integer,
        active: column.integer,
        created_at: column.text,
        updated_at: column.text,
    },
    { indexes: { checklist_template_user: ["user_id", "active"] } }
);

const checklist_template_items = new Table(
    {
        user_id: column.text,
        template_id: column.text,
        label: column.text,
        required: column.integer,
        sort_order: column.integer,
        created_at: column.text,
    },
    { indexes: { checklist_template_item: ["template_id", "sort_order"] } }
);

const checklist_runs = new Table(
    {
        user_id: column.text,
        template_id: column.text,
        vehicle_id: column.text,
        assigned_user_id: column.text,
        status: column.text,
        driver_name: column.text,
        damage_notes: column.text,
        signature_name: column.text,
        signature_storage_path: column.text,
        started_at: column.text,
        completed_at: column.text,
        created_at: column.text,
    },
    { indexes: { checklist_run_vehicle: ["vehicle_id", "started_at"] } }
);

const checklist_run_items = new Table(
    {
        user_id: column.text,
        run_id: column.text,
        template_item_id: column.text,
        label: column.text,
        result: column.text,
        notes: column.text,
        photo_storage_path: column.text,
        sort_order: column.integer,
        created_at: column.text,
    },
    { indexes: { checklist_run_item: ["run_id", "sort_order"] } }
);

export const AppSchema = new Schema({
    vehicles,
    todos,
    profiles,
    fuel_expenses,
    insurance_expenses,
    service_expenses,
    general_expenses,
    reminders,
    vehicle_documents,
    service_parts,
    garages,
    garage_memberships,
    fleet_billing_accounts,
    charging_expenses,
    vehicle_budgets,
    trips,
    report_schedules,
    checklist_templates,
    checklist_template_items,
    checklist_runs,
    checklist_run_items,
});

export type Database = (typeof AppSchema)["types"];
export type Vehicle = Database["vehicles"];
export type Todo = Database["todos"];
export type Profile = Database["profiles"];
export type FuelExpense = Database["fuel_expenses"];
export type InsuranceExpense = Database["insurance_expenses"];
export type ServiceExpense = Database["service_expenses"];
export type GeneralExpense = Database["general_expenses"];
export type Reminder = Database["reminders"];
export type VehicleDocument = Database["vehicle_documents"];
export type ServicePart = Database["service_parts"];
export type Garage = Database["garages"];
export type GarageMembership = Database["garage_memberships"];
export type FleetBillingAccount = Database["fleet_billing_accounts"];
export type ChargingExpense = Database["charging_expenses"];
export type VehicleBudget = Database["vehicle_budgets"];
export type Trip = Database["trips"];
export type ReportSchedule = Database["report_schedules"];
export type ChecklistTemplate = Database["checklist_templates"];
export type ChecklistTemplateItem = Database["checklist_template_items"];
export type ChecklistRun = Database["checklist_runs"];
export type ChecklistRunItem = Database["checklist_run_items"];
