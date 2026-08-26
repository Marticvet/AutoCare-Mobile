import { useEffect, useMemo, useState } from "react";
import {
    ExpenseRecord,
    ReminderRecord,
    ServicePartRecord,
    VehicleRecord,
    DocumentRecord,
} from "./models";
import { FuelExpense } from "../powersync/AppSchema";
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
        NULL AS valid_to
    FROM fuel_expenses
    UNION ALL
    SELECT id, 'service' AS source, 'service' AS category,
        COALESCE(type_of_service, 'Service') AS title, COALESCE(cost, 0) AS amount,
        COALESCE(date, substr(created_at, 1, 10), '') AS date, time,
        odometer, COALESCE(location_name, place) AS place, payment_method, notes,
        selected_vehicle_id AS vehicle_id, user_id, NULL AS litres,
        NULL AS price_per_litre, NULL AS fuel_type, '0' AS full_tank,
        NULL AS valid_to
    FROM service_expenses
    UNION ALL
    SELECT id, 'insurance' AS source, 'insurance' AS category,
        COALESCE(provider, 'Insurance') AS title, COALESCE(cost, 0) AS amount,
        COALESCE(valid_from, substr(created_at, 1, 10), '') AS date, NULL AS time,
        odometer, provider AS place, payment_method, notes,
        selected_vehicle_id AS vehicle_id, user_id, NULL AS litres,
        NULL AS price_per_litre, NULL AS fuel_type, '0' AS full_tank,
        valid_to
    FROM insurance_expenses
    UNION ALL
    SELECT id, 'general' AS source, COALESCE(category, 'other') AS category,
        COALESCE(title, category, 'Expense') AS title, COALESCE(amount, 0) AS amount,
        COALESCE(date, substr(created_at, 1, 10), '') AS date, time,
        odometer, place, payment_method, notes, vehicle_id, user_id,
        NULL AS litres, NULL AS price_per_litre, NULL AS fuel_type,
        '0' AS full_tank, NULL AS valid_to
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
