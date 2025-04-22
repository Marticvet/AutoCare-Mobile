// DrawerNavigator.tsx
import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import SettingsScreen from "../OptionsScreen";

const Drawer = createDrawerNavigator();

const DrawerNavigator = () => {
    return (
        <Drawer.Navigator
            screenOptions={{
                drawerStyle: { backgroundColor: "#212640", width: 280 },
                drawerActiveTintColor: "#ffffff",
                drawerInactiveTintColor: "#888",
                headerTintColor: "#ffffff",
                headerStyle: { backgroundColor: "#212640" },
            }}
        >
            {/* The HomeTabs are nested inside the drawer */}
            {/* <Drawer.Screen
                name="HomeTabs"
                component={HomeTabs}
                options={({ navigation }) => ({
                    title: "Home",
                    headerLeft: () => (
                        <Pressable
                            onPress={() => navigation.openDrawer()}
                            style={{ marginLeft: 15 }}
                        >
                            <Ionicons name="menu" size={24} color="white" />
                        </Pressable>
                    ),
                })}
            /> */}
            {/* Additional drawer screens */}
            <Drawer.Screen
                name="Notifications"
                component={() => null}
                options={({ navigation }: any) => ({
                    title: "Notifications",
                    headerLeft: () => (
                        <Pressable
                            onPress={() => navigation.openDrawer()}
                            style={{ marginLeft: 15 }}
                        >
                            <Ionicons name="menu" size={24} color="white" />
                        </Pressable>
                    ),
                })}
            />
            <Drawer.Screen
                name="Profile"
                component={() => null}
                options={({ navigation }: any) => ({
                    title: "Profile",
                    headerLeft: () => (
                        <Pressable
                            onPress={() => navigation.openDrawer()}
                            style={{ marginLeft: 15 }}
                        >
                            <Ionicons name="menu" size={24} color="white" />
                        </Pressable>
                    ),
                })}
            />
            <Drawer.Screen
                name="Settings"
                component={SettingsScreen}
                options={({ navigation }: any) => ({
                    title: "Settings",
                    headerLeft: () => (
                        <Pressable
                            onPress={() => navigation.openDrawer()}
                            style={{ marginLeft: 15 }}
                        >
                            <Ionicons name="menu" size={24} color="white" />
                        </Pressable>
                    ),
                })}
            />
        </Drawer.Navigator>
    );
};

export default DrawerNavigator;
