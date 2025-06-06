// App.tsx
import * as React from "react";
import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { AuthProvider, useAuth } from "./src/providers/AuthProvider";
import LoginScreen from "./src/Screens/LoginScreen";
import RegisterScreen from "./src/Screens/RegisterScreen";
import QueryProvider from "./src/providers/QueryProvider";
import { ProfileDataProvider } from "./src/providers/ProfileDataProvider";

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

import * as Notifications from "expo-notifications";
import { Alert, Button, Platform, View } from "react-native";

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

Notifications.setNotificationHandler({
    handleNotification: async () => {
        return {
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowAlert: true,
        };
    },
});

function App() {
    useEffect(() => {
        async function configurePushNotifications() {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
    
            if (existingStatus !== "granted") {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
    
            if (finalStatus !== "granted") {
                Alert.alert("Permission required", "Push notifications need the appropriate permissions.");
                return;
            }
    
            try {
                const pushTokenData = await Notifications.getExpoPushTokenAsync({
                    projectId: "328791db-8e15-4bb1-928d-dddadb59567e", // required for EAS builds
                });
                console.log("Expo Push Token:", pushTokenData.data);
    
                // You can now send pushTokenData.data to your backend here if needed
            } catch (error) {
                console.log("Failed to get push token:", error);
            }
    
            if (Platform.OS === "android") {
                await Notifications.setNotificationChannelAsync("default", {
                    name: "default",
                    importance: Notifications.AndroidImportance.DEFAULT,
                });
            }
        }
    
        configurePushNotifications();
    }, []);

    useEffect(() => {
        const subscription1 = Notifications.addNotificationReceivedListener(
            (notification) => {
                console.log("NOTIFICATION RECEIVED");
                console.log(notification);
                const userName = notification.request.content.data.userName;
                console.log(userName);
            }
        );

        const subscription2 =
            Notifications.addNotificationResponseReceivedListener(
                (response) => {
                    console.log("NOTIFICATION RESPONSE RECEIVED");
                    console.log(response);
                    const userName =
                        response.notification.request.content.data.userName;
                    console.log(userName);
                }
            );

        return () => {
            subscription1.remove();
            subscription2.remove();
        };
    }, []);

    function scheduleNotificationHandler() {
        Notifications.scheduleNotificationAsync({
            content: {
                title: "My first local notification",
                body: "This is the body of the notification.",
                data: { userName: "Marto" },
            },
            // @ts-ignore
            trigger: {
                seconds: 1,
            },
        });
    }

    async function sendPushNotification(expoPushToken: string) {
        const message = {
          to: expoPushToken,
          sound: 'default',
          title: 'Original Title',
          body: 'And here is the body!',
          data: { someData: 'goes here' },
        };

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });
      }

    //   <View style={{

    //     marginTop: 400
    // }}>
    //     <Button
    //         title="Schedule Notification"
    //         onPress={scheduleNotificationHandler}
    //     />
    //     <Button
    //         title="Send Push Notification"
    //         onPress={async () => {
    //             await sendPushNotification("expoPushToken");
    //           }}
    //     />
    // </View>
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
                component={ReportsScreen}
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
