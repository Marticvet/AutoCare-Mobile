import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSystem } from "../../powersync/PowerSync";
import { Vehicle } from "../../powersync/AppSchema";

let queryKey: string = "vehicles";

export const useVehicleList = (userId: string) => {
    const { db } = useSystem();

    return useQuery({
        queryKey: ["vehicles", userId],
        queryFn: async () => {
            return await db
                .selectFrom("vehicles")
                .selectAll()
                .where("user_id", "=", userId)
                .execute();
        },
    });
};

export const useVehicle = (userId: string, vehicleId: string) => {
    const { db } = useSystem();

    return useQuery({
        queryKey: ["vehicles", userId, vehicleId],
        queryFn: async () => {
            const result = await db
                .selectFrom("vehicles")
                .selectAll()
                .where("user_id", "=", userId)
                .where("id", "=", vehicleId) // assuming `id` is an integer
                .execute();

            // If you expect a single row, extract it
            if (result.length === 0) {
                throw new Error("Vehicle not found");
            }

            return result[0];
        },
    });
};

export const useInsertVehicle = () => {
    const { db } = useSystem(); // use PowerSync db
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (vehicle: Vehicle) => {
            await db.insertInto("vehicles").values(vehicle).execute();
            return vehicle;
        },
        onSuccess: async () => {
            // @ts-ignore
            await queryClient.invalidateQueries([queryKey]);
        },
        onError: (error) => {
            console.error("Failed to insert vehicle:", error);
        },
    });
};

export const useUpdateVehicle = () => {
    const { db } = useSystem(); // PowerSync local db
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            vehicle,
            vehicleId,
            userId,
        }: {
            vehicle: Vehicle;
            vehicleId: string;
            userId: string;
        }) => {
            await db
                .updateTable("vehicles")
                .set(vehicle)
                .where("id", "=", vehicleId)
                .where("user_id", "=", userId)
                .execute();

            return vehicle;
        },
        onSuccess: async () => {
            // @ts-ignore
            await queryClient.invalidateQueries(["vehicles"]);
        },
        onError: (error) => {
            console.error("Update failed:", error);
        },
    });
};

export const useDeleteVehicle = () => {
    const { db } = useSystem(); // PowerSync local db
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            vehicleId,
            userId,
        }: {
            vehicleId: string;
            userId: string;
        }) => {
            await db
                .deleteFrom("vehicles")
                .where("id", "=", vehicleId)
                .where("user_id", "=", userId)
                .execute();
        },
        onSuccess: async () => {
            console.log("Vehicle deleted from local DB.");
            // @ts-ignore
            await queryClient.invalidateQueries(["vehicles"]);
        },
        onError: (error) => {
            console.error("Delete failed:", error);
        },
    });
};
