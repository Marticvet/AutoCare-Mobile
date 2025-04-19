import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useContext } from "react";
import React from "react";
import { ProfileContext } from "../providers/ProfileDataProvider";
import HomeScreenDropdown from "./HomeScreenDropdown";
import Carousel from "react-native-reanimated-carousel";

const { width } = Dimensions.get("window");

const ITEM_WIDTH = width * 0.8;
const ITEM_HEIGHT = 200;

function HomeScreen() {
    const navigation = useNavigation();
    const { selectedVehicle, vehicles, userProfile } = useContext(ProfileContext);

    function navigateTo() {
        // @ts-ignore
        navigation.navigate("ReminderScreen");
    }

    return (
        <ScrollView contentContainerStyle={styles.container} nestedScrollEnabled={true}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    Welcome Back, {userProfile?.first_name}!
                </Text>
                <Text style={styles.headerSubtitle}>
                    Keep track of your car's health
                </Text>
            </View>

            {/* Dropdown */}
            <View style={styles.dropdownContainer}>
                <HomeScreenDropdown
                    // @ts-ignore
                    data={vehicles}
                    placeholder="Select your vehicle"
                />
            </View>

            {/* Vehicle Info */}
            <View style={styles.contentContainer}>
                <Text style={styles.infoText}>
                    Selected Vehicle: {selectedVehicle?.id}
                </Text>
                <Text style={styles.sectionTitle}>Your Vehicles</Text>
            </View>

            {vehicles && vehicles.length === 0 && (
                <Text>No available vehicles...</Text>
            )}

            {vehicles && vehicles.length > 0 && (
                <Carousel
                    loop
                    width={width * 0.85} // full screen
                    height={ITEM_HEIGHT}
                    style={{ marginTop: 12}}
                    data={vehicles}
                    scrollAnimationDuration={400}
                    mode="parallax"
                    modeConfig={{}}
                    renderItem={({ item }) => (
                        <View style={styles.cardWrapper}>
                            <View style={styles.card}>
                                <Text style={styles.title}>
                                    🚗 {item.vehicle_brand} {item.vehicle_model}
                                </Text>
                                <Text>Odometer: {item.current_mileage} km</Text>
                                <Text>Next Service:</Text>
                                <Text>Insurance Expires:</Text>
                                <Text>Last Tire Change:</Text>
                            </View>
                        </View>
                    )}
                />
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 16,
    },
    dropdownContainer: {
        marginBottom: 20,
    },
    contentContainer: {},
    infoText: {
        fontSize: 18,
        color: "#333",
    },
    header: {
        width: "100%",
        height: 64,
        justifyContent: "center",
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 24,
    },
    headerSubtitle: {
        fontSize: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginVertical: 10,
    },
    cardWrapper: {
        width: ITEM_WIDTH,
        alignSelf: "center", // ✅ Center inside full-width carousel
        // justifyContent: "center"
    },
    card: {
        width: "95%",
        height: 200,
        borderRadius: 16,
        backgroundColor: "#fff",
        padding: 16,
        marginHorizontal: 8,
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 3,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#00AFCF",
        marginBottom: 10,
    },
});

export default HomeScreen;
