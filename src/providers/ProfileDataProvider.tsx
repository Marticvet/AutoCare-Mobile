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
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

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
    locations?: string[];
    gasStations?: string[];
    userVehiclesFuelType?: string[];
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
    locations: [],
    gasStations: [],
    userVehiclesFuelType: [],
});

const ProfileDataProvider = ({ children }: PropsWithChildren) => {
    const { profile } = useAuth();
    const userId = profile?.id || "";

    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [vehicles, setVehicles] = useState<VehicleData[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleData | null>(
        null
    );
    const [fuelExpenses, setFuelExpenses] = useState<Fuel_Expenses[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [insuranceExpenses, setInsuranceExpenses] = useState<
        Insurance_Expenses[]
    >([]);
    const [serviceExpenses, setServiceExpenses] = useState<Service_Expenses[]>(
        []
    );
    const [locations, setLocations] = useState<string[]>([]);
    const [gasStations, setGasStations] = useState<string[]>([]);
    const [userVehiclesFuelType, setUserVehiclesFuelType] = useState<string[]>(
        []
    );

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
    } = useInsuranceExpensesList(
        userId,
        userProfile?.selected_vehicle_id || ""
    );

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
        if (userProfileData) {
            setUserProfile(userProfileData);
            AsyncStorage.setItem(
                "cachedUserProfile",
                JSON.stringify(userProfileData)
            );
        }
    }, [userProfileData]);

    useEffect(() => {
        if (vehicleList) {
            setVehicles(vehicleList);
            AsyncStorage.setItem("cachedVehicles", JSON.stringify(vehicleList));
        }
    }, [vehicleList]);

    useEffect(() => {
        if (vehicleData) {
            setSelectedVehicle(vehicleData);
            AsyncStorage.setItem(
                "cachedSelectedVehicle",
                JSON.stringify(vehicleData)
            );
        }
    }, [vehicleData]);

    useEffect(() => {
        if (fuelExpensesData) {
            setFuelExpenses(fuelExpensesData);
            AsyncStorage.setItem(
                "cachedFuelExpenses",
                JSON.stringify(fuelExpensesData)
            );
        }
    }, [fuelExpensesData]);

    useEffect(() => {
        if (expensesData) {
            setExpenses(expensesData);
            AsyncStorage.setItem(
                "cachedExpenses",
                JSON.stringify(expensesData)
            );
        }
    }, [expensesData]);

    useEffect(() => {
        if (insuranceExpensesData) {
            setInsuranceExpenses(insuranceExpensesData);
            AsyncStorage.setItem(
                "cachedInsuranceExpenses",
                JSON.stringify(insuranceExpensesData)
            );
        }
    }, [insuranceExpensesData]);

    useEffect(() => {
        if (servicexpensesData) {
            setServiceExpenses(servicexpensesData);
            AsyncStorage.setItem(
                "cachedServiceExpenses",
                JSON.stringify(servicexpensesData)
            );
        }
    }, [servicexpensesData]);

    useEffect(() => {
        const gasStationsArray: string[] = [];
        const allLocations: string[] = [];
        const userVehiclesFuelTypeArray: string[] = [];

        setLocations(gasStationsArray);
        setGasStations(allLocations);
        setUserVehiclesFuelType(userVehiclesFuelTypeArray);

        if (fuelExpensesData && fuelExpensesData.length > 0) {
            fuelExpensesData.forEach((fuelExpense) => {
                if (fuelExpense.location_name) {
                    allLocations.push(fuelExpense.location_name);
                    gasStationsArray.push(fuelExpense.location_name);
                }

                if (fuelExpense.fuel_type) {
                    userVehiclesFuelTypeArray.push(fuelExpense.fuel_type);
                }
            });

            setGasStations(gasStationsArray);
            setUserVehiclesFuelType(userVehiclesFuelTypeArray);
        }

        if (servicexpensesData && servicexpensesData.length > 0) {
            servicexpensesData.forEach((serviceExpense) => {
                if (serviceExpense.location_name) {
                    allLocations.push(serviceExpense.location_name);
                }
            });
        }
        setLocations(allLocations);
    }, [fuelExpensesData, servicexpensesData]);

    // async sync storage
    useEffect(() => {
        const loadCachedData = async () => {
            try {
                const [
                    cachedProfile,
                    cachedVehicles,
                    cachedSelectedVehicle,
                    cachedFuelExpenses,
                    cachedExpenses,
                    cachedInsuranceExpenses,
                    cachedServiceExpenses,
                ] = await Promise.all([
                    AsyncStorage.getItem("cachedUserProfile"),
                    AsyncStorage.getItem("cachedVehicles"),
                    AsyncStorage.getItem("cachedSelectedVehicle"),
                    AsyncStorage.getItem("cachedFuelExpenses"),
                    AsyncStorage.getItem("cachedExpenses"),
                    AsyncStorage.getItem("cachedInsuranceExpenses"),
                    AsyncStorage.getItem("cachedServiceExpenses"),
                ]);

                if (cachedProfile) setUserProfile(JSON.parse(cachedProfile));
                if (cachedVehicles) setVehicles(JSON.parse(cachedVehicles));
                if (cachedSelectedVehicle)
                    setSelectedVehicle(JSON.parse(cachedSelectedVehicle));
                if (cachedFuelExpenses)
                    setFuelExpenses(JSON.parse(cachedFuelExpenses));
                if (cachedExpenses) setExpenses(JSON.parse(cachedExpenses));
                if (cachedInsuranceExpenses)
                    setInsuranceExpenses(JSON.parse(cachedInsuranceExpenses));
                if (cachedServiceExpenses)
                    setServiceExpenses(JSON.parse(cachedServiceExpenses));
            } catch (err) {
                console.warn("Error loading cached data:", err);
            }
        };

        loadCachedData();
    }, []);

    const syncPendingUpdates = async () => {
        const pending = await AsyncStorage.getItem("pendingProfileUpdate");
        if (pending) {
            const parsed = JSON.parse(pending);
            const { error } = await supabase
                .from("profiles")
                .update(parsed)
                .eq("id", parsed.id);
    
            if (!error) {
                await AsyncStorage.removeItem("pendingProfileUpdate");
                console.log("Synced pending profile update");
            } else {
                console.warn("Failed to sync pending profile update:", error);
            }
        }
    };
    
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            if (state.isConnected && profile?.id) {
                syncPendingUpdates();
            }
        });
    
        return () => unsubscribe();
    }, [profile?.id]);

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
                console.warn("🔁 Refresh error:", err);
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
            locations,
            gasStations,
            userVehiclesFuelType,
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
            locations,
            gasStations,
            userVehiclesFuelType,
        ]
    );

    return (
        <ProfileContext.Provider value={contextValue}>
            {children}
        </ProfileContext.Provider>
    );
};

export { ProfileContext, ProfileDataProvider };
