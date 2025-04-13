import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useRoute } from "@react-navigation/native";
import { SafeAreaView, StyleSheet, View, StatusBar } from "react-native";
import ServiceExpenseScreen from "../ServiceExpenseScreen";
import ReminderScreen from "../ReminderScreen";
import ReportsScreen from "../ReportsScreen";
import TotalExpensesScreen from "../TotalExpensesScreen";
import "react-native-reanimated";
import { FuelExpensesScreen } from "../FuelExpensesScreen";

const Tab = createMaterialTopTabNavigator();

export const HeaderServiceNavigator = () => {
    return (
        <View style={{ flex: 1 }}>
            <Tab.Navigator
                initialRouteName={"TotalExpensesScreen"}
                screenOptions={{
                    tabBarStyle: { backgroundColor: "#E8E8E8" },
                    tabBarActiveTintColor: "#00AFCF",
                    tabBarInactiveTintColor: "gray",
                    tabBarIndicatorStyle: { backgroundColor: "#00AFCF" },
                    tabBarLabelStyle: { fontSize: 14, fontWeight: "bold" },
                }}
            >
                <Tab.Screen
                    name="TotalExpensesScreen"
                    component={TotalExpensesScreen}
                    options={{ title: "Total" }}
                />

                <Tab.Screen
                    name="FuelExpensesScreen"
                    component={FuelExpensesScreen}
                    options={{ title: "Fuel Epx" }}
                />
                <Tab.Screen
                    name="da"
                    component={ReminderScreen}
                    options={{ title: "Refueling" }}
                />

                <Tab.Screen
                    name="da1"
                    component={FuelExpensesScreen}
                    options={{ title: "Refueling" }}
                />
            </Tab.Navigator>
        </View>
    );
};

export default HeaderServiceNavigator;
