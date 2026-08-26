import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    PropsWithChildren,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { VehicleRecord } from "../data/models";
import { useVehicles } from "../data/liveQueries";
import { selectVehicle as persistSelectedVehicle } from "../data/repository";
import { useAuth } from "./AuthProvider";

type GarageContextValue = {
    vehicles: VehicleRecord[];
    selectedVehicle: VehicleRecord | null;
    selectedVehicleId: string;
    loading: boolean;
    selectVehicle: (vehicleId: string) => Promise<void>;
};

const GarageContext = createContext<GarageContextValue>({
    vehicles: [],
    selectedVehicle: null,
    selectedVehicleId: "",
    loading: true,
    selectVehicle: async () => undefined,
});

export function GarageProvider({ children }: PropsWithChildren) {
    const { userId, profile } = useAuth();
    const { data: vehicles, loading } = useVehicles(userId);
    const [localSelection, setLocalSelection] = useState("");
    const storageKey = `@autocare/selected-vehicle/${userId}`;

    useEffect(() => {
        if (!userId) {
            setLocalSelection("");
            return;
        }
        void AsyncStorage.getItem(storageKey).then((stored) => {
            if (stored) setLocalSelection(stored);
        });
    }, [storageKey, userId]);

    // Keep an explicit on-device selection authoritative immediately. Waiting
    // for the profile row to round-trip through PowerSync made the chip jump
    // back to the previous vehicle for a frame before settling.
    const preferred = localSelection || profile?.selected_vehicle_id;
    const selectedVehicle =
        vehicles.find((vehicle) => vehicle.id === preferred) ?? vehicles[0] ?? null;
    const selectedVehicleId = selectedVehicle?.id ?? "";

    useEffect(() => {
        if (selectedVehicleId && selectedVehicleId !== localSelection) {
            setLocalSelection(selectedVehicleId);
            void AsyncStorage.setItem(storageKey, selectedVehicleId);
        }
    }, [localSelection, selectedVehicleId, storageKey]);

    const value = useMemo<GarageContextValue>(
        () => ({
            vehicles,
            selectedVehicle,
            selectedVehicleId,
            loading,
            selectVehicle: async (vehicleId) => {
                setLocalSelection(vehicleId);
                await AsyncStorage.setItem(storageKey, vehicleId);
                if (userId) await persistSelectedVehicle(userId, vehicleId);
            },
        }),
        [vehicles, selectedVehicle, selectedVehicleId, loading, storageKey, userId]
    );

    return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>;
}

export const useGarage = () => useContext(GarageContext);
