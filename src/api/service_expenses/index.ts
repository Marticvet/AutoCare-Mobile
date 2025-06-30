import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSystem } from "../../powersync/PowerSync";
import { ServiceExpense } from "../../powersync/AppSchema";

const queryKey = "service_expenses";

export const useServiceExpensesList = (
    id: string,
    selected_vehicle_id: string
) => {
    const { db } = useSystem(); // use PowerSync db

    return useQuery({
        queryKey: [queryKey, id, selected_vehicle_id],
        queryFn: async () => {
            return await db
                .selectFrom("service_expenses")
                .selectAll()
                .where("user_id", "=", id)
                .where("selected_vehicle_id", "=", selected_vehicle_id)
                .execute();
        },
    });
};

export const useInsertServiceExpense = () => {
    const { db } = useSystem(); // use PowerSync db
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (service_expense: ServiceExpense) => {
            if (!service_expense.selected_vehicle_id) {
                throw new Error(
                    "Vehicle ID is required to insert service expense."
                );
            }

            await db
                .insertInto("service_expenses")
                .values(service_expense)
                .execute();

            return service_expense;
        },
        onSuccess: async () => {
            // @ts-ignore
            await queryClient.invalidateQueries([queryKey]); // Refresh local cache
        },
        onError: (err) => {
            console.error("Insert service expense error:", err);
        },
    });
};
