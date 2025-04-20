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
}

const ProfileContext = createContext<ProfileContextData>({
    userProfile: null,
    selectedVehicle: null,
    vehicles: [],
    isProfileLoading: false,
    isVehiclesLoading: false,
    setSelectedVehicle: () => {},
    fuelExpenses: [],
    expenses: [],
    insuranceExpenses: [],
    serviceExpenses: [],
});

const ProfileDataProvider = ({ children }: PropsWithChildren) => {
    const { profile } = useAuth();
    const userId = profile?.id || ""; // ✅ Ensure userId is set correctly

    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [vehicles, setVehicles] = useState<VehicleData[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleData | null>({
        id: "",
        selected_vehicle_id: "",
        vehicle_brand: "",
        vehicle_model: "",
        vehicle_model_year: 0,
        vehicle_car_type: "",
        vehicle_license_plate: "",
        vehicle_year_of_manufacture: 0,
        vehicle_identification_number: "",
        current_mileage: 0,
        user_id: ""
    }
    );
    const [fuelExpenses, setFuelExpenses] = useState<Fuel_Expenses[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [insuranceExpenses, setInsuranceExpenses] = useState<
        Insurance_Expenses[]
    >([]);
    const [serviceExpenses, setServiceExpenses] = useState<
        Service_Expenses[]
    >([]);

    // Fetch profile data
    const {
        data: userProfileData,
        isLoading: isProfileLoading,
        error: errorProfile,
    } = useProfile(userId);

    // Fetch vehicle list
    const {
        data: vehicleList,
        isLoading: isVehiclesLoading,
        error: errorVehicles,
    } = useVehicleList(userId);

    // Fetch selected vehicle
    const {
        data: vehicleData,
        isLoading: isSelectedVehicleLoading,
        error: errorSelectedVehicle,
    } = useVehicle(userId, userProfile?.selected_vehicle_id || "");

    // Get all fuelExpenses by userId and user's selected_vehicle_id
    const {
        data: fuelExpensesData,
        isLoading: isFuelExpensesLoading,
        error: errorFuelExpenses,
    } = useFuelExpensesList(
        userId || "",
        userProfile?.selected_vehicle_id || ""
    );

    // Get all insuranceExpenses by userId and user's selected_vehicle_id
    const {
        data: insuranceExpensesData,
        isLoading: isInsuranceExpensesLoading,
        error: errorInsuranceExpenses,
    } = useInsuranceExpensesList(
        userId || "",
        userProfile?.selected_vehicle_id || ""
    );

    // Get all serviceExpenses by userId and user's selected_vehicle_id
    const {
        data: servicexpensesData,
        isLoading: isServiceExpensesLoading,
        error: errorServiceExpenses,
    } = useServiceExpensesList(
        userId || "",
        userProfile?.selected_vehicle_id || ""
    );

    // Fetch all expenses by selected vehicle's id
    const {
        data: expensesData,
        isLoading: isExpensesLoading,
        error: errorExpenses,
    } = useExpensesList(userProfile?.selected_vehicle_id || "");

    // ✅ Load userProfile when API call completes
    useEffect(() => {
        if (userProfileData) {
            setUserProfile(userProfileData);
        }
    }, [userProfileData]);

    // ✅ Load vehicles when API call completes
    useEffect(() => {
        if (vehicleList) {
            setVehicles(vehicleList);
        }
    }, [vehicleList, isVehiclesLoading]);

    // ✅ Set selected vehicle when `vehicleData` is fetched
    useEffect(() => {
        if (vehicleData) {
            setSelectedVehicle(vehicleData);
        }
    }, [vehicleData, isSelectedVehicleLoading]);

    useEffect(() => {
        if (fuelExpensesData) {
            setFuelExpenses(fuelExpensesData);
        }
    }, [fuelExpensesData, isFuelExpensesLoading]);

    useEffect(() => {
        if (expensesData) {
            setExpenses(expensesData);
        }
    }, [expensesData, isExpensesLoading]);

    useEffect(() => {
        if (servicexpensesData) {
            setServiceExpenses(servicexpensesData);
        }
    }, [servicexpensesData, isServiceExpensesLoading]);

    useEffect(() => {
        if (insuranceExpensesData) {
            setInsuranceExpenses(insuranceExpensesData);
        }
    }, [insuranceExpensesData, isInsuranceExpensesLoading]);

    // Memoize context value to optimize performance
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
            serviceExpenses
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
            serviceExpenses
        ]
    );

    return (
        <ProfileContext.Provider value={contextValue}>
            {children}
        </ProfileContext.Provider>
    );
};

export { ProfileContext, ProfileDataProvider };
