import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSystem } from "../../powersync/PowerSync";

const queryKey: string = "service_expenses";

export const useServiceExpensesList = (
    id: string,
    selected_vehicle_id: string
) => {
    const { supabaseConnector } = useSystem();

    return useQuery({
        queryKey: [queryKey, id, selected_vehicle_id],
        queryFn: async () => {
            const { data, error } = await supabaseConnector
                .from(queryKey)
                .select("*")
                .eq("user_id", id) // Filter by user_id
                .eq("selected_vehicle_id", selected_vehicle_id); // Filter by selected_vehicle_id
            if (error) {
                throw new Error(error.message);
            }
            return data;
        },
    });
};

export const useInsertServiceExpense = () => {
    const { supabaseConnector } = useSystem();

    return useMutation({
        mutationFn: async (service_expenses: Service_Expenses) => {
            if (!service_expenses.selected_vehicle_id) {
                console.error("Error: No vehicle ID provided.");
                throw new Error(
                    "Vehicle ID is required to insert service expense."
                );
            }

            const { error, data: newServiceExpenses } = await supabaseConnector
                .from(queryKey) // Ensure correct table name
                .insert([service_expenses])
                .select()
                .single();

            if (error) {
                console.error(
                    "Error inserting service expense:",
                    error.message
                );
                throw new Error(error.message);
            }

            console.log("New Service Expense Inserted:", newServiceExpenses);
            return newServiceExpenses;
        },
    });
};
