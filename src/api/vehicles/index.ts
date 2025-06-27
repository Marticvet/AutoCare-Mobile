import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VehicleData } from "../../../types/vehicle";
import { useSystem } from "../../powersync/PowerSync";

let queryKey: string = "vehicles";

export const useVehicleList = (id: string) => {
    const { supabaseConnector } = useSystem();

    return useQuery({
        queryKey: [queryKey],
        queryFn: async () => {
            const { data, error } = await supabaseConnector
                .from(queryKey)
                .select("*")
                .eq("user_id", id); // Filter by user_id
            if (error) {
                throw new Error(error.message);
            }
            return data;
        },
    });
};

export const useVehicle = (id: string, vehicleId: string) => {
    const { supabaseConnector } = useSystem();

    return useQuery({
        queryKey: [queryKey, id, vehicleId],
        queryFn: async () => {
            const { data, error } = await supabaseConnector
                .from(queryKey)
                .select("*")
                .eq("user_id", id) // Filter by user_id
                .eq("id", vehicleId)
                .single();

            if (error) {
                throw new Error(error.message);
            }
            return data;
        },
    });
};

export const useInsertVehicle = () => {
    const { supabaseConnector } = useSystem();

    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (vehicle: VehicleData) => {
            const { error, data: newVehicle } = await supabaseConnector
                .from(queryKey) // Corrected table name
                .insert([vehicle])
                .eq("user_id", vehicle.user_id)
                .single();

            if (error) {
                console.error("Error inserting vehicle:", error.message);
                throw new Error(error.message);
            }

            console.log("New Vehicle Inserted:", newVehicle);
            return newVehicle;
        },
        onSuccess: async () => {
            // @ts-ignore
            await queryClient.invalidateQueries([queryKey]); // Ensure data updates
        },
    });
};

export const useUpdateVehicle = () => {
    const { supabaseConnector } = useSystem();

    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            vehicle,
            vehicleId,
            userId,
        }: {
            vehicle: VehicleData;
            vehicleId: string;
            userId: string;
        }) => {
            const { error, data: updatedVehicle } = await supabaseConnector
                .from(queryKey) // Use correct table name
                .update(vehicle) // Only update the fields inside `vehicle`
                .eq("id", vehicleId) // Update only the selected vehicle
                .eq("user_id", userId) // Ensure user is the owner
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return updatedVehicle;
        },
        onSuccess: async (_, { vehicleId }) => {
            console.log("Vehicle updated successfully!");

            // Refresh the list and the updated vehicle
            // @ts-ignore
            await queryClient.invalidateQueries(["vehicles"]); // Refresh all vehicles
        },
    });
};

export const useDeleteVehicle = () => {
    const { supabaseConnector } = useSystem();

    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn({
            vehicleId,
            userId,
        }: {
            vehicleId: string;
            userId: string;
        }) {
            const { error } = await supabaseConnector
                .from("vehicles")
                .delete()
                .eq("id", vehicleId)
                .eq("user_id", userId); // Ensures user owns the vehicle
            // .eq("user_id", (await supabase.auth.getUser()).data.user?.id); // Ensures user owns the vehicle

            if (error) {
                console.error("Error deleting vehicle:", error);
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            console.log("Vehicle deleted! Refreshing data...");
            // @ts-ignore
            queryClient.invalidateQueries(["vehicles"]); // Refresh vehicle list
        },
    });
};
