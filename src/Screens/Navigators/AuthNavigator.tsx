// AuthNavigator.js
import { createStackNavigator } from "@react-navigation/stack";
import QueryProvider from "../../providers/QueryProvider";
import AddVehicleScreen from "../AddVehicleScreen";
import VehicleDetailScreen from "../VehicleDetailScreen";
import ReportsScreen from "../ReportsScreen";
import ServiceScreen from "../ServiceExpenseScreen";
import ReminderScreen from "../ReminderScreen";
import HomeScreen from "../HomeScreen"; // if needed
import ServiceExpensesScreen from "../ServiceExpenseScreen";

const AppStack = createStackNavigator();

export default function AuthNavigator() {
    return (
        <QueryProvider>
            <AppStack.Navigator
                initialRouteName="Home" // Changed from "HomeDrawer" since the drawer is global now
                screenOptions={{
                    headerStyle: {
                        backgroundColor: "#212640",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                        fontWeight: "bold",
                    },
                }}
            >
                <AppStack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{
                        title: "Home",
                        headerShown: false,
                    }}
                />
                <AppStack.Screen
                    name="AddVehicleScreen"
                    component={AddVehicleScreen}
                    options={{ title: "Add Vehicle" }}
                />
                <AppStack.Screen
                    name="GetVehicleById"
                    component={VehicleDetailScreen}
                    options={{ title: "Your Vehicle" }}
                />
            </AppStack.Navigator>
        </QueryProvider>
    );
}
