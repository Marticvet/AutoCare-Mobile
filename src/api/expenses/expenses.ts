import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Fuel_Expenses } from "../../../types/fuel_expenses";

const queryKey: string = "vehicles";

export const useExpensesList = (selected_vehicle_id: string) => {
    return useQuery({
        queryKey: [queryKey, selected_vehicle_id], // Ensure key is meaningful
        queryFn: async () => {
            const { data, error } = await supabase
                .from(queryKey)
                .select("*, fuel_expenses(*), insurance_expenses(*), service_expenses(*)") // Fetch vehicle + related fuel expenses
                .eq("id", selected_vehicle_id); // Ensure selected_vehicle_id is used

            if (error) {
                throw new Error(error.message);
            }
            return data;
        },
    });
};
