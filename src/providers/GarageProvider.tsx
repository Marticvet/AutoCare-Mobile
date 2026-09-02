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
import { GarageAccessRecord, useGarages, useVehicles } from "../data/liveQueries";
import { selectVehicle as persistSelectedVehicle } from "../data/repository";
import { useAuth } from "./AuthProvider";

type GarageContextValue = {
    vehicles: VehicleRecord[];
    garages: GarageAccessRecord[];
    activeGarage: GarageAccessRecord | null;
    activeGarageId: string;
    dataOwnerId: string;
    currentRole: "owner" | "admin" | "driver" | "viewer";
    canWrite: boolean;
    canManageMembers: boolean;
    selectedVehicle: VehicleRecord | null;
    selectedVehicleId: string;
    loading: boolean;
    selectVehicle: (vehicleId: string) => Promise<void>;
    selectGarage: (garageId: string) => Promise<void>;
};

const GarageContext = createContext<GarageContextValue>({
    vehicles: [],
    garages: [],
    activeGarage: null,
    activeGarageId: "",
    dataOwnerId: "",
    currentRole: "owner",
    canWrite: true,
    canManageMembers: true,
    selectedVehicle: null,
    selectedVehicleId: "",
    loading: true,
    selectVehicle: async () => undefined,
    selectGarage: async () => undefined,
});

export function GarageProvider({ children }: PropsWithChildren) {
    const { userId, profile } = useAuth();
    const { data: allGarages, loading: garagesLoading } = useGarages(userId);
    const [localGarageSelection, setLocalGarageSelection] = useState("");
    const garageStorageKey = `@autocare/selected-garage/${userId}`;
    const garages = useMemo(
        () => allGarages.filter((garage) =>
            garage.owner_user_id === userId
            || (
                garage.membership_status === "active"
                && garage.status === "active"
                && (garage.kind === "family" || garage.kind === "fleet")
            )
        ),
        [allGarages, userId]
    );
    const activeGarage = garages.find((garage) => garage.id === localGarageSelection)
        ?? garages.find((garage) => garage.owner_user_id === userId)
        ?? garages[0]
        ?? null;
    const activeGarageId = activeGarage?.id ?? "";
    const dataOwnerId = activeGarage?.owner_user_id ?? userId;
    const currentRole = (activeGarage?.current_role ?? "owner") as GarageContextValue["currentRole"];
    const canWrite = currentRole !== "viewer";
    const canManageMembers = currentRole === "owner" || currentRole === "admin";
    const { data: vehicles, loading: vehiclesLoading } = useVehicles(dataOwnerId);
    const loading = garagesLoading || vehiclesLoading;
    const [localSelection, setLocalSelection] = useState("");
    const storageKey = `@autocare/selected-vehicle/${userId}/${dataOwnerId}`;

    useEffect(() => {
        if (!userId) {
            setLocalGarageSelection("");
            return;
        }
        void AsyncStorage.getItem(garageStorageKey).then((stored) => {
            if (stored) setLocalGarageSelection(stored);
        });
    }, [garageStorageKey, userId]);

    useEffect(() => {
        if (!activeGarageId || activeGarageId === localGarageSelection) return;
        setLocalGarageSelection(activeGarageId);
        void AsyncStorage.setItem(garageStorageKey, activeGarageId);
    }, [activeGarageId, garageStorageKey, localGarageSelection]);

    useEffect(() => {
        if (!userId) {
            setLocalSelection("");
            return;
        }
        setLocalSelection("");
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
            garages,
            activeGarage,
            activeGarageId,
            dataOwnerId,
            currentRole,
            canWrite,
            canManageMembers,
            selectedVehicle,
            selectedVehicleId,
            loading,
            selectVehicle: async (vehicleId) => {
                setLocalSelection(vehicleId);
                await AsyncStorage.setItem(storageKey, vehicleId);
                if (userId) await persistSelectedVehicle(userId, vehicleId);
            },
            selectGarage: async (garageId) => {
                if (!garages.some((garage) => garage.id === garageId)) return;
                setLocalGarageSelection(garageId);
                await AsyncStorage.setItem(garageStorageKey, garageId);
            },
        }),
        [activeGarage, activeGarageId, canManageMembers, canWrite, currentRole, dataOwnerId, garageStorageKey, garages, loading, selectedVehicle, selectedVehicleId, storageKey, userId, vehicles]
    );

    return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>;
}

export const useGarage = () => useContext(GarageContext);
