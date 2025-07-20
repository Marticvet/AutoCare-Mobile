import { useCallback, useEffect, useState } from "react";
import { useSystem } from "../../powersync/PowerSync";
import { InsuranceExpense } from "../../powersync/AppSchema";

export const useInsuranceExpensesList = (
    userId: string,
    selectedVehicleId: string
) => {
    const { db } = useSystem();
    const [insuranceExpenses, setInsuranceExpenses] = useState<
        InsuranceExpense[] | null
    >(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await db
                .selectFrom("insurance_expenses")
                .selectAll()
                .where("user_id", "=", userId)
                .where("selected_vehicle_id", "=", selectedVehicleId)
                .execute();

            setInsuranceExpenses(result);
        } catch (err) {
            setError(err as Error);
            setInsuranceExpenses(null);
        } finally {
            setLoading(false);
        }
    }, [db, userId, selectedVehicleId]);

    useEffect(() => {
        if (userId && selectedVehicleId) {
            fetchExpenses();
        }
    }, [fetchExpenses]);

    return { insuranceExpenses, loading, error, refetch: fetchExpenses };
};

export const useInsertInsuranceExpense = () => {
    const { db } = useSystem();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const insertExpense = useCallback(
        async (expense: InsuranceExpense) => {
            setLoading(true);
            setError(null);

            try {
                if (!expense.selected_vehicle_id) {
                    throw new Error(
                        "Vehicle ID is required to insert insurance expense."
                    );
                }

                const result = await db
                    .insertInto("insurance_expenses")
                    .values(expense)
                    .execute();

                console.log("Insurance expense inserted locally!", result);
            } catch (err) {
                console.error("Local insurance insert failed:", err);
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
