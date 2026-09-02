import { useEffect, useMemo, useState } from "react";
import {
    ExpenseRecord,
    ReminderRecord,
    ServicePartRecord,
    VehicleRecord,
    DocumentRecord,
    ChecklistRunItemRecord,
    ChecklistRunRecord,
    ChecklistTemplateItemRecord,
    ChecklistTemplateRecord,
    ReportScheduleRecord,
    TripRecord,
    VehicleBudgetRecord,
} from "./models";
import { FuelExpense } from "../powersync/AppSchema";
import type { FleetBillingAccount, Garage, GarageMembership } from "../powersync/AppSchema";
import { useSystem } from "../powersync/PowerSync";

export function useLiveRows<T>(sql: string, parameters: unknown[] = []) {
    const { powersync } = useSystem();
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const parameterKey = JSON.stringify(parameters);

    useEffect(() => {
        const controller = new AbortController();
        let mounted = true;
        const resolvedParameters = JSON.parse(parameterKey) as unknown[];
        setLoading(true);
        setError(null);
        setData([]);

        void (async () => {
            try {
                for await (const result of powersync.watch(sql, resolvedParameters, {
                    signal: controller.signal,
                    throttleMs: 80,
                })) {
                    if (!mounted) return;
                    setData(((result.rows as any)?._array ?? []) as T[]);
                    setError(null);
                    setLoading(false);
                }
            } catch (caught) {
                if (mounted && !controller.signal.aborted) {
                    setError(caught as Error);
                    setLoading(false);
                }
            }
        })();

        return () => {
            mounted = false;
            controller.abort();
        };
    }, [powersync, sql, parameterKey]);

    return { data, loading, error };
}

export const useVehicles = (userId: string) =>
    useLiveRows<VehicleRecord>(
        `SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC, vehicle_brand, vehicle_model`,
        [userId]
    );

export const useVehicle = (userId: string, vehicleId?: string) => {
    const result = useLiveRows<VehicleRecord>(
        `SELECT * FROM vehicles WHERE user_id = ? AND id = ? LIMIT 1`,
        [userId, vehicleId ?? ""]
    );
    return { ...result, data: result.data[0] ?? null };
};

const EXPENSE_SQL = `
SELECT * FROM (
    SELECT id, 'fuel' AS source, 'fuel' AS category,
        COALESCE(fuel_type, 'Fuel') AS title, COALESCE(total_cost, 0) AS amount,
        COALESCE(date, substr(created_at, 1, 10), '') AS date, time,
        odometer, COALESCE(location_name, gas_station) AS place, payment_method, notes,
        selected_vehicle_id AS vehicle_id, user_id, total_litres AS litres,
        price_liter AS price_per_litre, fuel_type, full_tank,
        NULL AS valid_to, latitude, longitude,
        NULL AS energy_kwh, NULL AS price_per_kwh,
        NULL AS battery_start_percent, NULL AS battery_end_percent,
        NULL AS charger_type, NULL AS charging_speed_kw,
        NULL AS efficiency_kwh_per_100km,
        import_batch_id, external_id
    FROM fuel_expenses
    UNION ALL
    SELECT id, 'charging' AS source, 'charging' AS category,
        'EV charging' AS title, COALESCE(total_cost, 0) AS amount,
        COALESCE(date, substr(created_at, 1, 10), '') AS date, time,
        odometer, location_name AS place, payment_method, notes,
        selected_vehicle_id AS vehicle_id, user_id, NULL AS litres,
        NULL AS price_per_litre, 'electric' AS fuel_type, '0' AS full_tank,
        NULL AS valid_to, latitude, longitude,
        energy_kwh, price_per_kwh, battery_start_percent, battery_end_percent,
        charger_type, charging_speed_kw, efficiency_kwh_per_100km,
        import_batch_id, external_id
    FROM charging_expenses
    UNION ALL
    SELECT id, 'service' AS source, 'service' AS category,
        COALESCE(type_of_service, 'Service') AS title, COALESCE(cost, 0) AS amount,
        COALESCE(date, substr(created_at, 1, 10), '') AS date, time,
        odometer, COALESCE(location_name, place) AS place, payment_method, notes,
        selected_vehicle_id AS vehicle_id, user_id, NULL AS litres,
        NULL AS price_per_litre, NULL AS fuel_type, '0' AS full_tank,
        NULL AS valid_to, latitude, longitude,
        NULL AS energy_kwh, NULL AS price_per_kwh,
        NULL AS battery_start_percent, NULL AS battery_end_percent,
        NULL AS charger_type, NULL AS charging_speed_kw,
        NULL AS efficiency_kwh_per_100km,
        import_batch_id, external_id
    FROM service_expenses
    UNION ALL
    SELECT id, 'insurance' AS source, 'insurance' AS category,
        COALESCE(provider, 'Insurance') AS title, COALESCE(cost, 0) AS amount,
        COALESCE(valid_from, substr(created_at, 1, 10), '') AS date, NULL AS time,
        odometer, COALESCE(location_name, provider) AS place, payment_method, notes,
        selected_vehicle_id AS vehicle_id, user_id, NULL AS litres,
        NULL AS price_per_litre, NULL AS fuel_type, '0' AS full_tank,
        valid_to, latitude, longitude,
        NULL AS energy_kwh, NULL AS price_per_kwh,
        NULL AS battery_start_percent, NULL AS battery_end_percent,
        NULL AS charger_type, NULL AS charging_speed_kw,
        NULL AS efficiency_kwh_per_100km,
        import_batch_id, external_id
    FROM insurance_expenses
    UNION ALL
    SELECT id, 'general' AS source, COALESCE(category, 'other') AS category,
        COALESCE(title, category, 'Expense') AS title, COALESCE(amount, 0) AS amount,
        COALESCE(date, substr(created_at, 1, 10), '') AS date, time,
        odometer, COALESCE(location_name, place) AS place, payment_method, notes, vehicle_id, user_id,
        NULL AS litres, NULL AS price_per_litre, NULL AS fuel_type,
        '0' AS full_tank, NULL AS valid_to, latitude, longitude,
        NULL AS energy_kwh, NULL AS price_per_kwh,
        NULL AS battery_start_percent, NULL AS battery_end_percent,
        NULL AS charger_type, NULL AS charging_speed_kw,
        NULL AS efficiency_kwh_per_100km,
        import_batch_id, external_id
    FROM general_expenses
) entries
WHERE user_id = ? AND (? = '' OR vehicle_id = ?)
ORDER BY date DESC, COALESCE(time, '') DESC, id DESC`;

export const useExpenses = (userId: string, vehicleId?: string) => {
    const vehicle = vehicleId ?? "";
    const result = useLiveRows<Omit<ExpenseRecord, "full_tank"> & { full_tank: string }>(
        EXPENSE_SQL,
        [userId, vehicle, vehicle]
    );
    const data = useMemo<ExpenseRecord[]>(
        () => result.data.map((row) => ({ ...row, full_tank: row.full_tank === "1" || row.full_tank === "true" || (row.full_tank as unknown) === 1 })),
        [result.data]
    );
    return { ...result, data };
};

export const useFuelLogs = (userId: string, vehicleId?: string) => {
    const vehicle = vehicleId ?? "";
    return useLiveRows<FuelExpense>(
        `SELECT * FROM fuel_expenses WHERE user_id = ? AND (? = '' OR selected_vehicle_id = ?) ORDER BY odometer ASC`,
        [userId, vehicle, vehicle]
    );
};

export const useReminders = (userId: string, vehicleId?: string) => {
    const vehicle = vehicleId ?? "";
    return useLiveRows<ReminderRecord>(
        `SELECT * FROM reminders WHERE user_id = ? AND (? = '' OR vehicle_id = ?) ORDER BY status = 'completed', COALESCE(due_date, '9999-12-31'), COALESCE(due_mileage, 999999999)`,
        [userId, vehicle, vehicle]
    );
};

export const useDocuments = (userId: string, vehicleId?: string) => {
    const vehicle = vehicleId ?? "";
    return useLiveRows<DocumentRecord>(
        `SELECT * FROM vehicle_documents WHERE user_id = ? AND (? = '' OR vehicle_id = ?) ORDER BY COALESCE(expiration_date, '9999-12-31'), created_at DESC`,
        [userId, vehicle, vehicle]
    );
};

export const useServiceParts = (serviceExpenseId?: string) =>
    useLiveRows<ServicePartRecord>(
        `SELECT * FROM service_parts WHERE service_expense_id = ? ORDER BY created_at, name`,
        [serviceExpenseId ?? ""]
    );

export const useVehicleBudgets = (userId: string, vehicleId?: string) => {
    const vehicle = vehicleId ?? "";
    return useLiveRows<VehicleBudgetRecord>(
        `SELECT * FROM vehicle_budgets WHERE user_id = ? AND (? = '' OR vehicle_id = ?) ORDER BY updated_at DESC`,
        [userId, vehicle, vehicle]
    );
};

export const useTrips = (userId: string, vehicleId?: string) => {
    const vehicle = vehicleId ?? "";
    return useLiveRows<TripRecord>(
        `SELECT * FROM trips WHERE user_id = ? AND (? = '' OR vehicle_id = ?) ORDER BY start_at DESC`,
        [userId, vehicle, vehicle]
    );
};

export const useReportSchedules = (userId: string) =>
    useLiveRows<ReportScheduleRecord>(
        `SELECT * FROM report_schedules WHERE user_id = ? ORDER BY enabled DESC, next_run_at`,
        [userId]
    );

export const useChecklistTemplates = (userId: string) =>
    useLiveRows<ChecklistTemplateRecord>(
        `SELECT * FROM checklist_templates WHERE user_id = ? AND active = 1 ORDER BY is_default DESC, name`,
        [userId]
    );

export const useChecklistTemplateItems = (templateId?: string) =>
    useLiveRows<ChecklistTemplateItemRecord>(
        `SELECT * FROM checklist_template_items WHERE template_id = ? ORDER BY sort_order`,
        [templateId ?? ""]
    );

export const useChecklistRuns = (userId: string, vehicleId?: string) => {
    const vehicle = vehicleId ?? "";
    return useLiveRows<ChecklistRunRecord>(
        `SELECT * FROM checklist_runs WHERE user_id = ? AND (? = '' OR vehicle_id = ?) ORDER BY started_at DESC`,
        [userId, vehicle, vehicle]
    );
};

export const useChecklistRunItems = (runId?: string) =>
    useLiveRows<ChecklistRunItemRecord>(
        `SELECT * FROM checklist_run_items WHERE run_id = ? ORDER BY sort_order`,
        [runId ?? ""]
    );

export type GarageAccessRecord = Garage & {
    current_role: "owner" | "admin" | "driver" | "viewer" | null;
    membership_status: "pending" | "active" | "revoked" | null;
};

export const useGarages = (userId: string) =>
    useLiveRows<GarageAccessRecord>(
        `SELECT garages.*,
            CASE WHEN garages.owner_user_id = ? THEN 'owner' ELSE garage_memberships.role END AS current_role,
            CASE WHEN garages.owner_user_id = ? THEN 'active' ELSE garage_memberships.status END AS membership_status
         FROM garages
         LEFT JOIN garage_memberships
           ON garage_memberships.garage_id = garages.id AND garage_memberships.user_id = ?
         WHERE garages.owner_user_id = ? OR garage_memberships.user_id = ?
         ORDER BY garages.owner_user_id = ? DESC, garages.created_at`,
        [userId, userId, userId, userId, userId, userId]
    );

export const useGarageMemberships = (garageId?: string) =>
    useLiveRows<GarageMembership>(
        `SELECT * FROM garage_memberships
         WHERE garage_id = ? AND status IN ('pending', 'active')
         ORDER BY role = 'owner' DESC, status = 'active' DESC, created_at`,
        [garageId ?? ""]
    );

export const useMyPendingGarageInvitations = (userId: string) =>
    useLiveRows<GarageMembership>(
        `SELECT * FROM garage_memberships
         WHERE user_id = ? AND status = 'pending'
         ORDER BY created_at DESC`,
        [userId]
    );

export const useFleetBillingAccount = (garageId?: string) => {
    const result = useLiveRows<FleetBillingAccount>(
        `SELECT * FROM fleet_billing_accounts WHERE garage_id = ? LIMIT 1`,
        [garageId ?? ""]
    );
    return { ...result, data: result.data[0] ?? null };
};
