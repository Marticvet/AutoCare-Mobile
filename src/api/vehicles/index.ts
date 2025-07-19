import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSystem } from "../../powersync/PowerSync";
import { Vehicle } from "../../powersync/AppSchema";
import { useCallback, useEffect, useState } from "react";

export const useVehicleList = (userId: string) => {
    const { db } = useSystem();
    const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | boolean>(false);

    const fetchVehicles = useCallback(async () => {
        setLoading(true);
        try {
            const result = await db
                .selectFrom("vehicles")
                .selectAll()
                .where("user_id", "=", userId)
                .execute();

            setVehicles(result);
            setError(false);
        } catch (err: any) {
            setError(err);
            setVehicles(null);
        } finally {
            setLoading(false);
        }
    }, [db, userId]);

    useEffect(() => {
        if (userId) {
            fetchVehicles();
        }
    }, [fetchVehicles]);

    return { vehicles, loading, error, refetch: fetchVehicles };
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
                .where("id", "=", vehicleId)
                .execute();

            if (result.length === 0) {
                throw new Error("Vehicle not found");
            }

            return result[0];
        },
    });
};


export const useInsertVehicle = () => {
    const { db } = useSystem();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const insertVehicle = async (vehicle: Vehicle) => {
        setLoading(true);
        setError(null);
        try {
            await db.insertInto("vehicles").values(vehicle).execute();
            console.log("Vehicle inserted");
            return vehicle;
        } catch (err) {
            console.error("Insert failed:", err);
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { insertVehicle, loading, error };
};

export const useUpdateVehicle = () => {
    const { db } = useSystem();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const updateVehicle = async (
        vehicleId: string,
        userId: string,
        vehicle: Vehicle
    ) => {
        setLoading(true);
        setError(null);
        try {
            await db
                .updateTable("vehicles")
                .set(vehicle)
                .where("id", "=", vehicleId)
                .where("user_id", "=", userId)
                .execute();

            console.log("Vehicle updated");
        } catch (err) {
            console.error("Update failed:", err);
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { updateVehicle, loading, error };
};


export const useDeleteVehicle = (vehicleId: string, userId: string) => {
    const { db } = useSystem();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const deleteVehicle = async () => {
        setLoading(true);
        setError(null);
        try {
            await db
                .deleteFrom("vehicles")
                .where("id", "=", vehicleId)
                .where("user_id", "=", userId)
                .execute();

            console.log("Vehicle deleted");
        } catch (err) {
            console.error("Delete failed:", err);
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { deleteVehicle, loading, error };
};

