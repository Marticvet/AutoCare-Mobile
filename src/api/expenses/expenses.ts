import { useCallback, useEffect, useState } from "react";
import { useSystem } from "../../powersync/PowerSync";
import {
    Vehicle,
    FuelExpense,
    InsuranceExpense,
    ServiceExpense,
} from "../../powersync/AppSchema";

type VehicleWithExpenses = Vehicle & {
    FuelExpense: FuelExpense[];
    insurance_expenses: InsuranceExpense[];
    service_expenses: ServiceExpense[];
};

export const useExpensesList = (selectedVehicleId: string) => {
    const { db } = useSystem();
    const [vehicleData, setVehicleData] = useState<VehicleWithExpenses | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch the vehicle
            const vehicle = await db
                .selectFrom("vehicles")
                .selectAll()
                .where("id", "=", selectedVehicleId)
                .executeTakeFirst();

            if (!vehicle) {
                throw new Error("Vehicle not found");
            }

            // Fetch related expenses
            const [fuel, insurance, service] = await Promise.all([
                db
                    .selectFrom("fuel_expenses")
                    .selectAll()
                    .where("selected_vehicle_id", "=", selectedVehicleId)
                    .execute(),
                db
                    .selectFrom("insurance_expenses")
                    .selectAll()
                    .where("selected_vehicle_id", "=", selectedVehicleId)
                    .execute(),
                db
                    .selectFrom("service_expenses")
                    .selectAll()
                    .where("selected_vehicle_id", "=", selectedVehicleId)
                    .execute(),
            ]);

            setVehicleData({
                ...vehicle,
                FuelExpense: fuel,
                insurance_expenses: insurance,
                service_expenses: service,
            });
        } catch (err) {
            console.error("Failed to fetch vehicle with expenses:", err);
            setError(err as Error);
            setVehicleData(null);
        } finally {
            setLoading(false);
        }
    }, [db, selectedVehicleId]);

    useEffect(() => {
        if (selectedVehicleId) {
            fetchData();
        }
    }, [fetchData]);

    return { vehicleData, loading, error, refetch: fetchData };
};
