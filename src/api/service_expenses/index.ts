import { useCallback, useEffect, useState } from "react";
import { useSystem } from "../../powersync/PowerSync";
import { ServiceExpense } from "../../powersync/AppSchema";

export const useServiceExpensesList = (
    userId: string,
    selectedVehicleId: string
) => {
    const { db } = useSystem();
    const [serviceExpenses, setServiceExpenses] = useState<
        ServiceExpense[] | null
    >(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await db
                .selectFrom("service_expenses")
                .selectAll()
                .where("user_id", "=", userId)
                .where("selected_vehicle_id", "=", selectedVehicleId)
                .execute();

            setServiceExpenses(result);
        } catch (err) {
            setError(err as Error);
            setServiceExpenses(null);
        } finally {
            setLoading(false);
        }
    }, [db, userId, selectedVehicleId]);

    useEffect(() => {
        if (userId && selectedVehicleId) {
            fetchExpenses();
        }
    }, [fetchExpenses]);

    return { serviceExpenses, loading, error, refetch: fetchExpenses };
};

export const useInsertServiceExpense = () => {
    const { db } = useSystem();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const insertExpense = useCallback(
        async (expense: ServiceExpense) => {
            setLoading(true);
            setError(null);

            try {
                if (!expense.selected_vehicle_id) {
                    throw new Error(
                        "Vehicle ID is required to insert service expense."
                    );
                }

                const result = await db
                    .insertInto("service_expenses")
                    .values(expense)
                    .execute();

                console.log("Service expense inserted locally!", result);
            } catch (err) {
                console.error("Local insert failed:", err);
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
