import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSystem } from "../../powersync/PowerSync";
import { FuelExpense } from "../../powersync/AppSchema";

const queryKey = "fuel_expenses";

export const useFuelExpensesList = (
    id: string,
    selected_vehicle_id: string
) => {
    const { db } = useSystem(); // Kysely DB from PowerSync

    return useQuery({
        queryKey: [queryKey, id, selected_vehicle_id],
        queryFn: async () => {
            return await db
                .selectFrom("fuel_expenses")
                .selectAll()
                .where("user_id", "=", id)
                .where("selected_vehicle_id", "=", selected_vehicle_id)
                .execute();
        },
    });
};

export const useInsertFuelExpense = () => {
    const { db } = useSystem(); // Kysely DB from PowerSync
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (fuel_expense: FuelExpense) => {
            if (!fuel_expense.selected_vehicle_id) {
                throw new Error(
                    "Vehicle ID is required to insert fuel expense."
                );
            }

            await db.insertInto("fuel_expenses").values(fuel_expense).execute();

            return fuel_expense;
        },
        onSuccess: () => {
            // @ts-ignore
            queryClient.invalidateQueries([queryKey]);
        },
        onError: (error) => {
            console.error("Error inserting fuel expense:", error);
        },
    });
};
