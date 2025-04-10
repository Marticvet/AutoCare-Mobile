import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Fuel_Expenses } from "../../../types/fuel_expenses";

const queryKey: string = "fuel_expenses";

export const useFuelExpensesList = (id: string, selected_vehicle_id: string) => {
    return useQuery({
        queryKey: [queryKey, id, selected_vehicle_id],
        queryFn: async () => {
            const { data, error } = await supabase
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

export const useInsertFuelExpense = () => {
    return useMutation({
        mutationFn: async (fuel_expense: Fuel_Expenses) => {
            if (!fuel_expense.selected_vehicle_id) {
                console.error("❌ Error: No vehicle ID provided.");
                throw new Error(
                    "Vehicle ID is required to insert fuel expense."
                );
            }

            const { error, data: newFuelExpense } = await supabase
                .from(queryKey) // ✅ Ensure correct table name
                .insert([fuel_expense])
                .select()
                .single();

            if (error) {
                console.error(
                    "❌ Error inserting fuel expense:",
                    error.message
                );
                throw new Error(error.message);
            }

            console.log("✅ New Fuel Expense Inserted:", newFuelExpense);
            return newFuelExpense;
        },
    });
};
