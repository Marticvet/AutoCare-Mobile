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
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { Profile, Vehicle } from "../powersync/AppSchema";

interface ProfileContextData {
    userProfile: Profile | null;
    selectedVehicle: Vehicle | null;
    isProfileLoading: boolean;
    isVehiclesLoading: boolean;
    errorProfile?: any;
    errorVehicles?: any;
    expenses?: any[];
    locations?: string[];
    gasStations?: string[];
    userVehiclesFuelType?: string[];
    refreshing: boolean;
    setRefreshing: (refreshing: boolean) => void;
}

const ProfileContext = createContext<ProfileContextData>({
    userProfile: null,
    selectedVehicle: null,
    isProfileLoading: false,
    isVehiclesLoading: false,
    refreshing: false,
    setRefreshing: () => {},
    expenses: [],
    locations: [],
    gasStations: [],
    userVehiclesFuelType: [],
});

const ProfileDataProvider = ({ children }: PropsWithChildren) => {
    const { profile } = useAuth();
    const userId = profile?.id || "";
    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [locations, setLocations] = useState<string[]>([]);
    const [gasStations, setGasStations] = useState<string[]>([]);
    const [userVehiclesFuelType, setUserVehiclesFuelType] = useState<string[]>(
        []
    );
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(
        null
    );
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // --- API Hooks
    const {
        profile: userProfileData,
        loading: isProfileLoading,
        error: errorProfile,
        refetch: refetchProfile,
    } = useProfile(userId);

    const {
        error: errorVehicles,
        loading: isVehiclesLoading,
        vehicles: vehiclesList,
    } = useVehicleList(userId);

    // --- Update local state when profile data changes
    useEffect(() => {
        if (userProfileData) {
            setUserProfile(userProfileData);
        }
    }, [userProfileData]);

    const {
        data: vehicleData,
        isLoading: isSelectedVehicleLoading,
        error: errorSelectedVehicle,
        refetch: refetchVehicle,
    } = useVehicle(userId, userProfile?.selected_vehicle_id || "");

    useEffect(() => {
        if (vehicleData) {
            setSelectedVehicle(vehicleData);
        } else {
            setSelectedVehicle(null);
        }
    }, [errorSelectedVehicle, isSelectedVehicleLoading, vehicleData]);
    // --- Manual refresh logic
    useEffect(() => {
        if (!refreshing) return;

        const doRefresh = async () => {
            try {
                await Promise.all([
                    refetchProfile(),
                    refetchVehicle(),
                    // refetchVehicleList(),
                    // refetchFuelExpenses(),
                    // refetchInsuranceExpenses(),
                    // refetchServiceExpenses(),
                    // refetchExpenses(),
                ]);
            } catch (err) {
                console.warn("🔁 Refresh error:", err);
            } finally {
                setRefreshing(false);
            }
        };

        doRefresh();
    }, [refreshing]);

    // --- Provide all data via context
    const contextValue = useMemo(
        () => ({
            userProfile,
            isProfileLoading,
            isVehiclesLoading,
            errorVehicles,
            errorProfile,
            refreshing,
            setRefreshing,
            locations,
            gasStations,
            userVehiclesFuelType,
            selectedVehicle,
        }),
        [
            userProfile,
            isProfileLoading,
            isVehiclesLoading,
            errorVehicles,
            errorProfile,
            refreshing,
            locations,
            gasStations,
            userVehiclesFuelType,
            selectedVehicle,
        ]
    );

    return (
        <ProfileContext.Provider value={contextValue}>
            {children}
        </ProfileContext.Provider>
    );
};

export { ProfileContext, ProfileDataProvider };

// import React, {
//     createContext,
//     PropsWithChildren,
//     useEffect,
//     useState,
//     useMemo,
//     useCallback,
// } from "react";
// import { useAuth } from "./AuthProvider";
// import { useProfile } from "../api/profiles";
// import { useVehicleList } from "../api/vehicles";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import NetInfo from "@react-native-community/netinfo";
// import { Profile } from "../powersync/AppSchema";

// interface ProfileContextData {
//     userProfile: Profile | null;
//     isProfileLoading: boolean;
//     isVehiclesLoading: boolean;
//     errorProfile?: any;
//     errorVehicles?: any;
//     expenses?: any[];
//     locations?: string[];
//     gasStations?: string[];
//     userVehiclesFuelType?: string[];
//     refreshing: boolean;
//     setRefreshing: (refreshing: boolean) => void;
// }

// const ProfileContext = createContext<ProfileContextData>({
//     userProfile: null,
//     isProfileLoading: false,
//     isVehiclesLoading: false,
//     refreshing: false,
//     setRefreshing: () => {},
//     expenses: [],
//     locations: [],
//     gasStations: [],
//     userVehiclesFuelType: [],
// });

// const ProfileDataProvider = ({ children }: PropsWithChildren) => {
//     const { profile } = useAuth();
//     const userId = profile?.id || "";

//     const [userProfile, setUserProfile] = useState<Profile | null>();
//     const [locations, setLocations] = useState<string[]>([]);
//     const [gasStations, setGasStations] = useState<string[]>([]);
//     const [userVehiclesFuelType, setUserVehiclesFuelType] = useState<string[]>(
//         []
//     );

//     const [refreshing, setRefreshing] = useState<boolean>(false);

//     // --- API Hooks with refetch support
//     const {
//         profile: userProfileData,
//         loading: isProfileLoading,
//         error: errorProfile,
//         refetch: refetchProfile,
//     } = useProfile(userId);

//     const {
//         error: errorVehicles,
//         loading: isVehiclesLoading,
//         vehicles: vehiclesList,
//     } = useVehicleList(userId);

//     // Update local state when data changes
//     useEffect(() => {
//         if (userProfileData) {
//             setUserProfile(userProfileData);
//         }
//     }, [userProfileData]);

//     // useEffect(() => {
//     //     const gasStationsArray: string[] = [];
//     //     const allLocations: string[] = [];
//     //     const userVehiclesFuelTypeArray: string[] = [];

//     //     setLocations(gasStationsArray);
//     //     setGasStations(allLocations);
//     //     setUserVehiclesFuelType(userVehiclesFuelTypeArray);

//     //     if (fuelExpensesData && fuelExpensesData.length > 0) {
//     //         fuelExpensesData.forEach((fuelExpense) => {
//     //             if (fuelExpense.location_name) {
//     //                 allLocations.push(fuelExpense.location_name);
//     //                 gasStationsArray.push(fuelExpense.location_name);
//     //             }

//     //             if (fuelExpense.fuel_type) {
//     //                 userVehiclesFuelTypeArray.push(fuelExpense.fuel_type);
//     //             }
//     //         });

//     //         setGasStations(gasStationsArray);
//     //         setUserVehiclesFuelType(userVehiclesFuelTypeArray);
//     //     }

//     //     if (servicexpensesData && servicexpensesData.length > 0) {
//     //         servicexpensesData.forEach((serviceExpense) => {
//     //             if (serviceExpense.location_name) {
//     //                 allLocations.push(serviceExpense.location_name);
//     //             }
//     //         });
//     //     }
//     //     setLocations(allLocations);
//     // }, [fuelExpensesData, servicexpensesData]);

//     // const syncPendingUpdates = async () => {
//     //     const pending = await AsyncStorage.getItem("pendingProfileUpdate");
//     //     if (pending) {
//     //         const parsed = JSON.parse(pending);
//     //         const result = await db
//     //             .selectFrom("profiles")
//     //             .forUpdate(parsed)
//     //             .where("id", "=", parsed.id);

//     //             console.log(result, `result`);

//     //         // if (result.length === 0) {
//     //         //     await AsyncStorage.removeItem("pendingProfileUpdate");
//     //         //     console.log("Synced pending profile update");
//     //         // } else {
//     //         //     console.warn("Failed to sync pending profile update:", error);
//     //         // }
//     //     }
//     // };

//     // useEffect(() => {
//     //     const unsubscribe = NetInfo.addEventListener((state) => {
//     //         if (state.isConnected && profile?.id) {
//     //             syncPendingUpdates();
//     //         }
//     //     });

//     //     return () => unsubscribe();
//     // }, [profile?.id]);

//     // Manual refresh logic
//     useEffect(() => {
//         if (!refreshing) return;

//         const doRefresh = async () => {
//             try {
//                 await Promise.all([
//                     refetchProfile(),
//                     // refetchVehicleList(),
//                     // // refetchVehicle(),
//                     // refetchFuelExpenses(),
//                     // refetchInsuranceExpenses(),
//                     // refetchServiceExpenses(),
//                     // refetchExpenses(),
//                 ]);
//             } catch (err) {
//                 console.warn("🔁 Refresh error:", err);
//             } finally {
//                 setRefreshing(false);
//             }
//         };

//         doRefresh();
//     }, [refreshing]);

//     // Provide all data via context
//     const contextValue = useMemo(
//         () => ({
//             userProfile,
//             isProfileLoading,
//             isVehiclesLoading,
//             errorVehicles,
//             errorProfile,
//             refreshing,
//             setRefreshing,
//             locations,
//             gasStations,
//             userVehiclesFuelType,
//         }),
//         [
//             userProfile,
//             isProfileLoading,
//             isVehiclesLoading,
//             errorVehicles,
//             errorProfile,
//             refreshing,
//             locations,
//             gasStations,
//             userVehiclesFuelType,
//         ]
//     );

//     return (
//         <ProfileContext.Provider value={contextValue}>
//             {children}
//         </ProfileContext.Provider>
//     );
// };

// export { ProfileContext, ProfileDataProvider };
