import { useCallback, useEffect, useState } from "react";
import { useSystem } from "../../powersync/PowerSync";
import { FuelExpense } from "../../powersync/AppSchema";

export const useFuelExpensesList = (
    userId: string,
    selectedVehicleId: string
) => {
    const { db } = useSystem();
    const [fuelExpenses, setFuelExpenses] = useState<FuelExpense[] | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await db
                .selectFrom("fuel_expenses")
                .selectAll()
                .where("user_id", "=", userId)
                .where("selected_vehicle_id", "=", selectedVehicleId)
                .execute();

            setFuelExpenses(result);
        } catch (err) {
            setError(err as Error);
            setFuelExpenses(null);
        } finally {
            setLoading(false);
        }
    }, [db, userId, selectedVehicleId]);

    useEffect(() => {
        if (userId && selectedVehicleId) {
            fetchExpenses();
        }
    }, [fetchExpenses]);

    return { fuelExpenses, loading, error, refetch: fetchExpenses };
};

export const useInsertFuelExpense = () => {
    const { db } = useSystem();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const insertExpense = useCallback(
        async (expense: FuelExpense) => {
            setLoading(true);
            setError(null);

            try {
                if (!expense.selected_vehicle_id) {
                    throw new Error(
                        "Vehicle ID is required to insert fuel expense."
                    );
                }

                const result = await db
                    .insertInto("fuel_expenses")
                    .values(expense)
                    .execute();

                console.log("Fuel expense inserted locally!", result);
            } catch (err) {
                console.error("Local fuel insert failed:", err);
                setError(err as Error);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [db]
    );

    return { insertExpense, loading, error };
};
