// App.tsx
import "@azure/core-asynciterator-polyfill";

import * as React from "react";
import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { AuthProvider, useAuth } from "./src/providers/AuthProvider";
import LoginScreen from "./src/Screens/LoginScreen";
import RegisterScreen from "./src/Screens/RegisterScreen";
import QueryProvider from "./src/providers/QueryProvider";
import { ProfileContext, ProfileDataProvider } from "./src/providers/ProfileDataProvider";

// Navigators & Global Screens
import SidebarNavigator from "./src/Screens/Navigators/SidebarNavigator";
import BottomNavigator from "./src/Screens/Navigators/BottomNavigator";
import ServiceExpensesScreen from "./src/Screens/ServiceExpenseScreen";
import ReminderScreen from "./src/Screens/ReminderScreen";
import ReportsScreen from "./src/Screens/TotalExpensesScreen";
import { InsuranceExpenseScreen } from "./src/Screens/InsuranceExpenseScreen";
import ServiceExpenseScreen from "./src/Screens/ServiceExpenseScreen";
import { FuelExpenseScreen } from "./src/Screens/FuelExpenseScreen";
import HeaderServiceNavigator from "./src/Screens/Navigators/HeaderServiceNavigator";
import MapScreen from "./src/Screens/MapScreen";
import VehicleDetailScreen from "./src/Screens/VehicleDetailScreen";
import EditVehicleScreen from "./src/Screens/EditVehicleScreen";
import { MyProfileScreen } from "./src/Screens/MyProfileScreen";
import { EditProfileScreen } from "./src/Screens/EditProfileScreen";

import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { OwnerVehiclesScreen } from "./src/Screens/OwnerVehiclesScreen";
import { FuelTypeScreen } from "./src/Screens/FuelTypeScreen";
import { GasStationsScreen } from "./src/Screens/GasStationsScreen";

import { Alert, Button, Platform, View, Text } from "react-native";
import { PowerSyncProvider } from "./src/powersync/PowerSyncProvider";
import { useSystem } from "./src/powersync/PowerSync";

const AuthStack = createStackNavigator();
const RootStack = createStackNavigator();

const MyTheme = {
    dark: false,
    colors: {
        primary: "white",
        background: "white",
        card: "rgb(20, 20, 20)",
        text: "rgb(255, 255, 255)",
        border: "rgb(50, 50, 50)",
        notification: "rgb(255, 69, 58)",
    },
    fonts: {
        regular: { fontFamily: "System", fontWeight: "400" }, // Corrected
        medium: { fontFamily: "System", fontWeight: "500" }, // Corrected
        bold: { fontFamily: "System", fontWeight: "700" }, // Corrected
        heavy: { fontFamily: "System", fontWeight: "800" }, // Corrected
    },
};

function App() {
    const system = useSystem();
    const { userProfile } = React.useContext(ProfileContext);

    useEffect(() => {
        system.init();
    }, []);

    const { db } = useSystem();

    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const result = await db
                    .selectFrom("vehicles")
                    .selectAll()
                    .where("user_id", "=", useAuth().profile?.id)
                    .execute();

                    console.log(result);
                    
            } catch (err: any) {
                console.log("Failed to fetch vehicles:", err);
            } 
        };

        fetchVehicles();
    }, [userProfile?.id, db]);

    return (
        <PowerSyncProvider>
            <ActionSheetProvider>
                <QueryProvider>
                    <AuthProvider>
                        <ProfileDataProvider>
                            <NavigationContainer
                                // @ts-ignore
                                theme={MyTheme}
                            >
                                <RootNavigator />
                            </NavigationContainer>
                        </ProfileDataProvider>
                    </AuthProvider>
                </QueryProvider>
            </ActionSheetProvider>
        </PowerSyncProvider>
    );

    return (
        <ActionSheetProvider>
            <QueryProvider>
                <AuthProvider>
                    <ProfileDataProvider>
                        <NavigationContainer
                            // @ts-ignore
                            theme={MyTheme}
                        >
                            <RootNavigator />
                        </NavigationContainer>
                    </ProfileDataProvider>
                </AuthProvider>
            </QueryProvider>
        </ActionSheetProvider>
    );
}

function RootNavigator() {
    const { session } = useAuth();

    // If not authenticated, show the non-auth stack.
    if (!session?.access_token) {
        return <NonAuthNavigator />;
    }

    // When authenticated, use a global RootStack:
    // - "MainApp" contains your SidebarNavigator wrapping the BottomNavigator.
    // - "ServiceExpensesScreen" (and any other global screens) is declared here.
    return (
        <RootStack.Navigator
            screenOptions={{
                // headerShown: false,
                headerStyle: {
                    backgroundColor: "#212640",
                },
            }}
        >
            <RootStack.Screen
                name="MainApp"
                component={MainAppNavigator}
                options={{
                    title: "Home",
                    headerShown: false,
                }}
            />
            <RootStack.Screen
                name="ReminderScreen"
                component={ReminderScreen}
                options={{ title: "Reminder" }}
            />
            <RootStack.Screen
                name="ReportsScreen"
                component={() => <ReportsScreen hideUIElements />}
                options={{ title: "Reports" }}
            />
            <RootStack.Screen
                name="ServiceExpenseScreen"
                component={ServiceExpenseScreen}
                options={{ title: "Service Expense" }}
            />
            <RootStack.Screen
                name="FuelExpenseScreen"
                component={FuelExpenseScreen}
                options={{ title: "Fuel Expense" }}
            />
            <RootStack.Screen
                name="InsuranceExpenseScreen"
                component={InsuranceExpenseScreen}
                options={{ title: "Insurance Expense" }}
            />
            <RootStack.Screen
                name="HeaderServiceNavigator"
                component={HeaderServiceNavigator}
                options={{ title: "Analitics" }}
            />
            <RootStack.Screen
                name="MapScreen"
                component={MapScreen}
                options={{ title: "Map" }}
            />
            <RootStack.Screen
                name="VehicleDetailScreen"
                component={VehicleDetailScreen}
                options={{ title: "Vehicle Details" }}
            />
            <RootStack.Screen
                name="EditVehicleScreen"
                component={EditVehicleScreen}
                options={{ title: "Edit Vehicle Details", headerBackTitle: "" }}
            />
            <RootStack.Screen
                name="MyProfileScreen"
                component={MyProfileScreen}
                options={{ title: "My Profile" }}
            />
            <RootStack.Screen
                name="EditProfileScreen"
                component={EditProfileScreen}
                options={{ title: "Edit Profile" }}
            />
            <RootStack.Screen
                name="OwnerVehiclesScreen"
                component={OwnerVehiclesScreen}
                options={{ title: "Your Vehicles", headerBackTitle: "Back" }}
            />
            <RootStack.Screen
                name="FuelTypeScreen"
                component={FuelTypeScreen}
                options={{ title: "Fuel Types" }}
            />

            <RootStack.Screen
                name="GasStationsScreen"
                component={GasStationsScreen}
                options={{ title: "Gas Stations" }}
            />

            {/* Add more global screens here if needed */}
        </RootStack.Navigator>
    );
}

function MainAppNavigator() {
    // Wrap your bottom tabs with your drawer so that the drawer is available globally.

    // <SidebarNavigator>
    // </SidebarNavigator>

    return <BottomNavigator />;
}

function NonAuthNavigator() {
    return (
        <AuthStack.Navigator
            initialRouteName="Login"
            screenOptions={{
                headerShown: false,
                gestureEnabled: false,
            }}
        >
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
    );
}

export default App;
