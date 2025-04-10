// SidebarNavigator.js
import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Drawer = createDrawerNavigator();

export default function SidebarNavigator(props: any) {
    const { children } = props;

    return (
        <Drawer.Navigator
            screenOptions={{
                drawerStyle: { backgroundColor: "#212640", width: 280 },
                drawerActiveTintColor: "#ffffff",
                drawerInactiveTintColor: "#888",
                headerShown: true,
                drawerType: "slide",
                headerTintColor: "#ffffff",
                headerStyle: { backgroundColor: "#212640" },
            }}
        >
            <Drawer.Screen
                name="Dashboard"
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
            >
                {() => children}
            </Drawer.Screen>
            {/* Optionally, you can add more drawer screens here */}
            {/* <Drawer.Screen
                name="Notifications"
                component={() => null}
                options={({ navigation }) => ({
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
                options={({ navigation }) => ({
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
                component={() => null}
                options={({ navigation }) => ({
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
            /> */}
        </Drawer.Navigator>
    );
}
