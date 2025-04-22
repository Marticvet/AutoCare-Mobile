import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useRoute } from "@react-navigation/native";
import { SafeAreaView, StyleSheet, View, StatusBar } from "react-native";
import ServiceExpenseScreen from "../ServiceExpenseScreen";
import ReminderScreen from "../ReminderScreen";
import ReportsScreen from "../TotalExpensesScreen";
import TotalExpensesScreen from "../TotalExpensesScreen";
import "react-native-reanimated";
import { FuelExpensesScreen } from "../FuelExpensesScreen";
import { InsuranceExpenseScreen } from "../InsuranceExpenseScreen";
import { ServiceExpensesScreen } from "../ServiceExpensesScreen";
import { InsuranceExpensesScreen } from "../InsuranceExpensesScreen";

const Tab = createMaterialTopTabNavigator();

export const HeaderServiceNavigator = () => {
    return (
        <View style={{ flex: 1 }}>
            <Tab.Navigator
                initialRouteName={"ReportsScreen"}
                screenOptions={{
                    tabBarStyle: { backgroundColor: "#E8E8E8" },
                    tabBarActiveTintColor: "#00AFCF",
                    tabBarInactiveTintColor: "gray",
                    tabBarIndicatorStyle: { backgroundColor: "#00AFCF" },
                    tabBarLabelStyle: { fontSize: 14, fontWeight: "bold" },
                }}
            >
                <Tab.Screen
                    name="ReportsScreen"
                    component={ReportsScreen}
                    options={{ title: "Total" }}
                />

                <Tab.Screen
                    name="FuelExpensesScreen"
                    component={FuelExpensesScreen}
                    options={{ title: "Fuel" }}
                />
                <Tab.Screen
                    name="ServiceExpensesScreen"
                    component={ServiceExpensesScreen}
                    options={{ title: "Service" }}
                />

                <Tab.Screen
                    name="InsuranceExpensesScreen"
                    component={InsuranceExpensesScreen}
                    options={{ title: "Insurance" }}
                />
            </Tab.Navigator>
        </View>
    );
};

export default HeaderServiceNavigator;
