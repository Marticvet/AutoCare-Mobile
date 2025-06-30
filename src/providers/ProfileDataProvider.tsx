import React, {
    createContext,
    PropsWithChildren,
    useEffect,
    useState,
    useMemo,
} from "react";
import { useAuth } from "./AuthProvider";
import { useProfile } from "../api/profiles";
import { useVehicle, useVehicleList } from "../api/vehicles";
import { useFuelExpensesList } from "../api/fuel_expenses";
import { useExpensesList } from "../api/expenses/expenses";
import { useInsuranceExpensesList } from "../api/insurance_expenses";
import { useServiceExpensesList } from "../api/service_expenses";
import NetInfo from "@react-native-community/netinfo";

import {
    Vehicle,
    Profile,
    FuelExpense,
    InsuranceExpense,
    ServiceExpense,
} from "../powersync/AppSchema";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { system, useSystem } from "../powersync/PowerSync";

interface ProfileContextData {
    userProfile: Profile | null;
    selectedVehicle: Vehicle | null;
    vehicles?: Vehicle[];
    isProfileLoading: boolean;
    isVehiclesLoading: boolean;
    errorProfile?: any;
    errorVehicles?: any;
    setSelectedVehicle: (vehicle: Vehicle | null) => void;
    fuelExpenses?: FuelExpense[];
    expenses?: any[];
    insuranceExpenses?: InsuranceExpense[];
    serviceExpenses?: ServiceExpense[];
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
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(
        null
    );
    const [fuelExpenses, setFuelExpenses] = useState<FuelExpense[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [insuranceExpenses, setInsuranceExpenses] = useState<
        InsuranceExpense[]
    >([]);
    const [serviceExpenses, setServiceExpenses] = useState<ServiceExpense[]>(
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
        }
    }, [userProfileData]);

    useEffect(() => {
        if (vehicleList) {
            setVehicles(vehicleList);
        }
    }, [vehicleList]);

    useEffect(() => {
        if (vehicleData) {
            setSelectedVehicle(vehicleData);
        }
    }, [vehicleData]);

    useEffect(() => {
        if (fuelExpensesData) {
            setFuelExpenses(fuelExpensesData);
        }
    }, [fuelExpensesData]);

    useEffect(() => {
        if (expensesData) {
            // setExpenses(expensesData);
        }
    }, [expensesData]);

    useEffect(() => {
        if (insuranceExpensesData) {
            setInsuranceExpenses(insuranceExpensesData);
        }
    }, [insuranceExpensesData]);

    useEffect(() => {
        if (servicexpensesData) {
            setServiceExpenses(servicexpensesData);
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

    const syncPendingUpdates = async () => {
        const { db } = useSystem();

        const pending = await AsyncStorage.getItem("pendingProfileUpdate");
        if (pending) {
            const parsed = JSON.parse(pending);
            const result = await db
                .updateTable("profiles")
                .set(parsed)
                .where("id", "=", parsed.id)
                .execute();

                          // If you expect a single row, extract it
            if (result.length === 0) {
                throw new Error("Vehicle not found");
            }
            if (result.length === 0) {
                await AsyncStorage.removeItem("pendingProfileUpdate");
                console.log("Synced pending profile update");
            } else {
                console.warn("Failed to sync pending profile update:", result[0]);
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
                console.warn("Refresh error:", err);
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
