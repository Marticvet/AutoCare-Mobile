import React, {
    createContext,
    PropsWithChildren,
    useEffect,
    useState,
    useMemo,
} from "react";
import { useAuth } from "./AuthProvider";
import { useProfile } from "../api/profiles";
import { Profile } from "../../types/profile";
import { VehicleData } from "../../types/vehicle";
import { useVehicle, useVehicleList } from "../api/vehicles";
import { Fuel_Expenses } from "../../types/fuel_expenses";
import { useFuelExpensesList } from "../api/fuel_expenses";
import { useExpensesList } from "../api/expenses/expenses";
import { Insurance_Expenses } from "../../types/insurance_expenses";
import { useInsuranceExpensesList } from "../api/insurance_expenses";
import { useServiceExpensesList } from "../api/service_expenses";
import { supabase } from "../lib/supabase";

interface ProfileContextData {
    userProfile: Profile | null;
    selectedVehicle: VehicleData | null;
    vehicles?: VehicleData[];
    isProfileLoading: boolean;
    isVehiclesLoading: boolean;
    errorProfile?: any;
    errorVehicles?: any;
    setSelectedVehicle: (vehicle: VehicleData | null) => void;
    fuelExpenses?: Fuel_Expenses[];
    expenses?: any[];
    insuranceExpenses?: Insurance_Expenses[];
    serviceExpenses?: Service_Expenses[];
    refreshing: boolean;
    setRefreshing: (refreshing: boolean) => void;
}

const ProfileContext = createContext<ProfileContextData>({
    userProfile: null,
    selectedVehicle: null,
    vehicles: [],
    isProfileLoading: false,
    isVehiclesLoading: false,
    setSelectedVehicle: () => {},
    refreshing: false,
    setRefreshing: () => {},
    fuelExpenses: [],
    expenses: [],
    insuranceExpenses: [],
    serviceExpenses: [],
});

const ProfileDataProvider = ({ children }: PropsWithChildren) => {
    const { profile } = useAuth();
    const userId = profile?.id || "";

    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [vehicles, setVehicles] = useState<VehicleData[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleData | null>(null);
    const [fuelExpenses, setFuelExpenses] = useState<Fuel_Expenses[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [insuranceExpenses, setInsuranceExpenses] = useState<Insurance_Expenses[]>([]);
    const [serviceExpenses, setServiceExpenses] = useState<Service_Expenses[]>([]);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // --- API Hooks with refetch support
    const {
        data: userProfileData,
        isLoading: isProfileLoading,
        error: errorProfile,
        refetch: refetchProfile,
    } = useProfile(userId);

    const {
        data: vehicleList,
        isLoading: isVehiclesLoading,
        error: errorVehicles,
        refetch: refetchVehicleList,
    } = useVehicleList(userId);

    const {
        data: vehicleData,
        isLoading: isSelectedVehicleLoading,
        error: errorSelectedVehicle,
        refetch: refetchVehicle,
    } = useVehicle(userId, userProfile?.selected_vehicle_id || "");

    const {
        data: fuelExpensesData,
        isLoading: isFuelExpensesLoading,
        error: errorFuelExpenses,
        refetch: refetchFuelExpenses,
    } = useFuelExpensesList(userId, userProfile?.selected_vehicle_id || "");

    const {
        data: insuranceExpensesData,
        isLoading: isInsuranceExpensesLoading,
        error: errorInsuranceExpenses,
        refetch: refetchInsuranceExpenses,
    } = useInsuranceExpensesList(userId, userProfile?.selected_vehicle_id || "");

    const {
        data: servicexpensesData,
        isLoading: isServiceExpensesLoading,
        error: errorServiceExpenses,
        refetch: refetchServiceExpenses,
    } = useServiceExpensesList(userId, userProfile?.selected_vehicle_id || "");

    const {
        data: expensesData,
        isLoading: isExpensesLoading,
        error: errorExpenses,
        refetch: refetchExpenses,
    } = useExpensesList(userProfile?.selected_vehicle_id || "");

    // Update local state when data changes
    useEffect(() => {
        if (userProfileData) setUserProfile(userProfileData);
    }, [userProfileData]);

    useEffect(() => {
        if (vehicleList) setVehicles(vehicleList);
    }, [vehicleList]);

    useEffect(() => {
        if (vehicleData) setSelectedVehicle(vehicleData);
    }, [vehicleData]);

    useEffect(() => {
        if (fuelExpensesData) setFuelExpenses(fuelExpensesData);
    }, [fuelExpensesData]);

    useEffect(() => {
        if (expensesData) setExpenses(expensesData);
    }, [expensesData]);

    useEffect(() => {
        if (insuranceExpensesData) setInsuranceExpenses(insuranceExpensesData);
    }, [insuranceExpensesData]);

    useEffect(() => {
        if (servicexpensesData) setServiceExpenses(servicexpensesData);
    }, [servicexpensesData]);

    // Realtime: Refresh on changes from other devices
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel("realtime:profile_sync")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "profiles",
                    filter: `id=eq.${userId}`,
                },
                (payload) => {
                    console.log("🔁 Realtime update from 'profiles':", payload);
                    setRefreshing(true);
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "vehicles",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    console.log("🔁 Realtime update from 'vehicles':", payload);
                    setRefreshing(true);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    // Manual refresh logic
    useEffect(() => {
        if (!refreshing) return;

        const doRefresh = async () => {
            try {
                await Promise.all([
                    refetchProfile(),
                    refetchVehicleList(),
                    refetchVehicle(),
                    refetchFuelExpenses(),
                    refetchInsuranceExpenses(),
                    refetchServiceExpenses(),
                    refetchExpenses(),
                ]);
            } catch (err) {
                console.error("🔁 Refresh error:", err);
            } finally {
                setRefreshing(false);
            }
        };

        doRefresh();
    }, [refreshing]);

    // Provide all data via context
    const contextValue = useMemo(
        () => ({
            userProfile,
            selectedVehicle,
            vehicles,
            isProfileLoading,
            isVehiclesLoading,
            errorProfile,
            errorVehicles,
            setSelectedVehicle,
            fuelExpenses,
            expenses,
            insuranceExpenses,
            serviceExpenses,
            refreshing,
            setRefreshing,
        }),
        [
            userProfile,
            selectedVehicle,
            vehicles,
            isProfileLoading,
            isVehiclesLoading,
            errorProfile,
            errorVehicles,
            fuelExpenses,
            expenses,
            insuranceExpenses,
            serviceExpenses,
            refreshing,
        ]
    );

    return (
        <ProfileContext.Provider value={contextValue}>
            {children}
        </ProfileContext.Provider>
    );
};

export { ProfileContext, ProfileDataProvider };

