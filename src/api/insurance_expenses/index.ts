import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSystem } from "../../powersync/PowerSync";
import { Insurance_Expenses } from "../../../types/insurance_expenses";

const queryKey = "insurance_expenses";

export const useInsuranceExpensesList = (
    id: string,
    selected_vehicle_id: string
) => {
    const { db } = useSystem(); // PowerSync Kysely DB

    return useQuery({
        queryKey: [queryKey, id, selected_vehicle_id],
        queryFn: async () => {
            const results = await db
                .selectFrom("insurance_expenses")
                .selectAll()
                .where("user_id", "=", id)
                .where("selected_vehicle_id", "=", selected_vehicle_id)
                .execute();

            return results;
        },
    });
};

export const useInsertInsuranceExpense = () => {
    const { db } = useSystem(); // PowerSync Kysely DB

    return useMutation({
        mutationFn: async (insurance_expense: Insurance_Expenses) => {
            if (!insurance_expense.selected_vehicle_id) {
                throw new Error(
                    "Vehicle ID is required to insert insurance expense."
                );
            }

            await db
                .insertInto("insurance_expenses")
                // @ts-ignore
                .values(insurance_expense)
                .execute();

            return insurance_expense;
        },
        onError: (error) => {
            console.error("Error inserting insurance expense:", error);
        },
    });
};
