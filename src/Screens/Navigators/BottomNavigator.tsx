import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../providers/AuthProvider";
import { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Modal, StyleSheet, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AuthNavigator from "./AuthNavigator";
import AddVehicleScreen from "../AddVehicleScreen";
import HomeScreen from "../HomeScreen";
import ReminderScreen from "../ReminderScreen";
import HeaderServiceNavigator from "./HeaderServiceNavigator";
import SettingsScreen from "../OptionsScreen";
import OptionsScreen from "../OptionsScreen";

const Tab = createBottomTabNavigator();

// 📌 **Bottom Tab Navigator for Logged-in Users**
export default function BottomNavigator() {
    const navigation = useNavigation();
    const { logout } = useAuth(); // Get logout function from AuthProvider
    const [modalVisible, setModalVisible] = useState(false);

    const handleSelection = (screen: string) => {
        setModalVisible(false);
        // @ts-ignore
        navigation.navigate(screen);
    };
    return (
        <View style={{ flex: 1, position: "relative" }}>
            <Tab.Navigator
                screenOptions={{
                    // headerShown: false,
                    headerStyle: {
                        backgroundColor: "#212640",
                    },
                    tabBarStyle: { backgroundColor: "#212640" },
                    tabBarActiveTintColor: "#ffffff",
                    tabBarInactiveTintColor: "#888",
                }}
            >
                <Tab.Screen
                    name="Home"
                    component={AuthNavigator} // Use AuthNavigator for Home Navigation
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons
                                name="home-outline"
                                size={size}
                                color={color}
                            />
                        ),
                    }}
                />
                <Tab.Screen
                    name="AddVehicleScreen"
                    component={AddVehicleScreen}
                    options={{
                        title: "Add Vehicle",
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons
                                name="car-outline"
                                size={size}
                                color={color}
                            />
                        ),
                    }}
                />

                {/* ✅ Floating Action Button (FAB) in the Center */}
                <Tab.Screen
                    name="Plus"
                    component={HomeScreen} // Dummy component
                    options={{
                        tabBarButton: () => (
                            <Pressable
                                style={styles.fabButton}
                                onPress={() => setModalVisible(true)}
                            >
                                <Ionicons name="add" size={32} color="white" />
                            </Pressable>
                        ),
                    }}
                    listeners={{
                        tabPress: (e) => {
                            e.preventDefault(); // Prevent navigation
                            setModalVisible(true);
                        },
                    }}
                />

                <Tab.Screen
                    name="OptionsScreen"
                    component={OptionsScreen}
                    options={{
                        title: "Options",
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons
                                name="options"
                                size={size}
                                color={color}
                            />
                        ),
                    }}
                />

                {/* Logout Button (Not a Screen, Just a Clickable Tab) */}
                <Tab.Screen
                    name="Logout"
                    component={LogoutButton} // ✅ Use a named component
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons
                                name="log-out-outline"
                                size={size}
                                color={color}
                            />
                        ),
                    }}
                    listeners={({ navigation }) => ({
                        tabPress: (e) => {
                            e.preventDefault(); // Prevent navigation
                            logout(); // Call the logout function
                        },
                    })}
                />
            </Tab.Navigator>

            {/* Modal for Selecting Actions */}
            {modalVisible && (
                <View style={styles.modalWrapper}>
                    <Modal
                        transparent
                        visible={modalVisible}
                        animationType="fade"
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <Pressable
                            style={styles.overlay}
                            // activeOpacity={1}
                            onPress={() => setModalVisible(false)}
                        >
                            <View style={styles.modalContainer}>
                                {[
                                    {
                                        title: "Fuel Expense",
                                        screen: "FuelExpenseScreen",
                                    },
                                    {
                                        title: "Insurance Expense",
                                        screen: "InsuranceExpenseScreen",
                                    },
                                    {
                                        title: "Service Expense",
                                        screen: "ServiceExpenseScreen",
                                    },
                                    {
                                        title: "Reminder",
                                        screen: "ReminderScreen",
                                    },
                                    {
                                        title: "Analitics",
                                        screen: "HeaderServiceNavigator",
                                    },
                                ]
                                    .sort((a, b) =>
                                        a.title.localeCompare(b.title)
                                    )
                                    .map((item, index) => (
                                        <Pressable
                                            key={index}
                                            style={styles.option}
                                            onPress={() =>
                                                handleSelection(item.screen)
                                            }
                                        >
                                            <Text style={styles.optionText}>
                                                {item.title}
                                            </Text>
                                        </Pressable>
                                    ))}
                                <Pressable
                                    style={styles.cancelButton}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.cancelText}>
                                        Cancel
                                    </Text>
                                </Pressable>
                            </View>
                        </Pressable>
                    </Modal>
                </View>
            )}
        </View>
    );
}

function LogoutButton() {
    return null;
}

const styles = StyleSheet.create({
    logoutButton: {
        marginRight: 15, // Add spacing to the right
    },
    logoutText: {
        color: "blue", // Customize the button text color
        fontSize: 16,
    },

    fabButton: {
        width: 60, // Slightly larger for better UI
        height: 60,
        borderRadius: 30,
        backgroundColor: "#00AFCF",
        justifyContent: "center",
        alignItems: "center",
        position: "absolute", // Ensures proper positioning
        bottom: 10, // Keeps it above the tab bar
        alignSelf: "center", // Centers the button horizontally
        zIndex: 10, // Ensures it's above other elements
        elevation: 5, // Gives a shadow effect (Android)
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        transform: [{ translateY: -10 }], // Moves up for a floating effect
    },

    modalWrapper: {
        position: "absolute",
        width: "100%",
        height: "100%",
        top: 0,
        left: 0,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
    },

    overlay: {
        flex: 1,
        // backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },

    modalContainer: {
        position: "absolute",
        bottom: 85,
        width: "90%",
        maxHeight: "70%",
        backgroundColor: "#212640",
        padding: 20,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 110,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },

    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 15,
    },

    option: {
        width: "100%",
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#444",
        alignItems: "center",
    },

    optionText: {
        fontSize: 18,
        color: "#fff",
    },

    cancelButton: {
        width: "100%",
        paddingVertical: 15,
        backgroundColor: "#fff",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: "#ddd",
        marginTop: 10,
        borderRadius: 10,
    },

    cancelText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#007AFF",
    },
    // option: {
    //     padding: 15,
    //     borderBottomWidth: 1,
    //     borderBottomColor: "#ddd",
    // },
    // optionText: {
    //     fontSize: 18,
    // },
    // cancelButton: {
    //     padding: 15,
    //     marginTop: 24,
    //     backgroundColor: "#ddd",
    //     borderRadius: 8,
    //     width: "100%",
    //     height: 50,
    //     flex: 1,
    //     alignItems: 'center',
    //     justifyContent: 'center',
    //     textAlign: 'center',
    // },
    // cancelText: {
    //     textAlign: "center",
    //     fontSize: 16,
    // },
    // overlay: {
    //     flex: 1,
    //     backgroundColor: "rgba(0,0,0,0.5)",
    //     justifyContent: "center", // Centers the modal vertically
    //     alignItems: "center", // Centers the modal horizontally
    // },
    // modalWrapper: {
    //     position: "absolute",
    //     width: "100%",
    //     height: "100%",
    //     top: 0,
    //     left: 0,
    //     justifyContent: "center",
    //     alignItems: "center",
    //     zIndex: 100, // Ensures it's above everything else
    // },
    // modalContainer: {
    //     position: "absolute",
    //     bottom: 85, // Ensures it's above the bottom tab bar
    //     width: "90%", // Responsive width
    //     maxHeight: "70%", // Prevents modal from being too large
    //     backgroundColor: "#212640",
    //     padding: 20,
    //     borderRadius: 16,
    //     alignItems: "center",
    //     justifyContent: "center",
    //     zIndex: 110, // Higher than the modalWrapper to stay on top
    //     elevation: 10,
    //     shadowColor: "#000",
    //     shadowOffset: { width: 0, height: 4 },
    //     shadowOpacity: 0.3,
    //     shadowRadius: 5,
    // },
});
