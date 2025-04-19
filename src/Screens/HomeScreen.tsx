import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ScrollView,
    Alert,
    ActivityIndicator,
    Animated,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useContext, useEffect, useRef, useState } from "react";
import React from "react";
import { ProfileContext } from "../providers/ProfileDataProvider";
import HomeScreenDropdown from "./HomeScreenDropdown";

import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");
// const ITEM_WIDTH = 280;
const ITEM_WIDTH = 250;
const ITEM_SPACING = 24;
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_SPACING;
const SIDE_SPACING = (Dimensions.get("window").width - ITEM_WIDTH) / 2;

function HomeScreen() {
    const navigation = useNavigation();
    const scrollX = useRef(new Animated.Value(0)).current;

    // Retrieve the values provided by ProfileDataProvider
    const { selectedVehicle, vehicles, userProfile } =
        useContext(ProfileContext);

    function navigateTo() {
        // @ts-ignore
        navigation.navigate("ReminderScreen");
    }

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            nestedScrollEnabled={true}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    Welcome Back, {userProfile?.first_name}!
                </Text>
                <Text style={styles.headerSubtitle}>
                    Keep track of your car's health
                </Text>
            </View>
            {/* Dropdown at the top */}
            <View style={styles.dropdownContainer}>
                <HomeScreenDropdown
                    // @ts-ignore
                    data={vehicles}
                    placeholder="Select your vehicle"
                />
            </View>
            {/* Rest of your screen */}
            <View style={styles.contentContainer}>
                <Text style={styles.infoText}>
                    Selected Vehicle: {selectedVehicle?.id}
                </Text>
                <Text style={styles.sectionTitle}>Your Vehicles</Text>

                {/* Other components, such as pickers or buttons, can go here */}
            </View>

            {vehicles && vehicles.length === 0 && (
                <Text>No available vehicles...</Text>
            )}

            {vehicles && vehicles.length > 0 && (
                <Animated.FlatList
                    data={vehicles}
                    keyExtractor={(item) => item.id.toString()}
                    horizontal
                    snapToInterval={ITEM_WIDTH + ITEM_SPACING}
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: SIDE_SPACING }}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: true }
                    )}
                    scrollEventThrottle={16}
                    renderItem={({ item, index }) => {
                        const inputRange = [
                            (index - 1) * (ITEM_WIDTH + ITEM_SPACING),
                            index * (ITEM_WIDTH + ITEM_SPACING),
                            (index + 1) * (ITEM_WIDTH + ITEM_SPACING),
                        ];

                        const scale = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.92, 1, 0.92],
                            extrapolate: "clamp",
                        });

                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.7, 1, 0.7],
                            extrapolate: "clamp",
                        });

                        return (
                            <TouchableOpacity
                                style={{
                                    width: ITEM_WIDTH,
                                    marginRight: ITEM_SPACING,
                                }}
                            >
                                <Animated.View
                                    style={[
                                        styles.card,
                                        { transform: [{ scale }], opacity },
                                    ]}
                                >
                                    <Text style={styles.heading}>
                                        🚘 {item.vehicle_brand}{" "}
                                        {item.vehicle_model}
                                    </Text>
                                    <Text>
                                        Odometer: {item.current_mileage} km
                                    </Text>
                                    <Text>Next Service:</Text>
                                    <Text>Insurance Expires:</Text>
                                    <Text>Last Tire Change:</Text>
                                </Animated.View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 16,
        // backgroundColor: "#f5f5f5",
    },
    dropdownContainer: {
        marginBottom: 20,
    },
    contentContainer: {
        // Additional styling for the remaining content
    },
    infoText: {
        fontSize: 18,
        color: "#333",
    },
    /////////
    card: {
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 3,
    },
    heading: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#00AFCF",
    },
    ////// user info
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
    listContainer: {
        paddingVertical: 10,
    },

    ////// scroll
    vehiclesScrollContainer: {
        marginTop: 24,
        height: 300,
        backgroundColor: "red",
    },
    vehiclesContainer: {
        flexDirection: "row",
        alignItems: "flex-start", // optional
        justifyContent: "center",
    },
    vehicleContainer: {
        // width: 280,
        width: 250,
        marginRight: 24,
        // height: 150
        height: 300,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginVertical: 10,
    },
});

export default HomeScreen;

// {isLoading === false && userVehicles.length > 0 && (
//     <FlatList
//         style={styles.vehiclesContainer}
//         data={userVehicles}
//         renderItem={({ item }) => {
//             return (
//                 <TouchableOpacity
//                     onPress={() =>
//                         quickActionHandler(
//                             "Get Vehicle By Id",
//                             item.id
//                         )
//                     }
//                 >
//                     <View style={styles.vehicleContainer}>
//                         <Text style={styles.vehicle}>
//                             Vehicle Brand: {item.vehicle_brand}
//                         </Text>
//                         <Text style={styles.vehicle}>
//                             Vehicle Type:{" "}
//                             {item.vehicle_car_type}
//                         </Text>
//                         <Text style={styles.vehicle}>
//                             Vehicle License Plate:{" "}
//                             {item.vehicle_license_plate}
//                         </Text>
//                         <Text style={styles.vehicle}>
//                             Vehicle Model: {item.vehicle_model}
//                         </Text>
//                         <Text style={styles.vehicle}>
//                             Vehicle Model Year:{" "}
//                             {item.vehicle_model_year}
//                         </Text>
//                         <Text style={styles.vehicle}>
//                             Vehicle Year Of Manufacture:{" "}
//                             {item.vehicle_year_of_manufacture}
//                         </Text>
//                     </View>
//                 </TouchableOpacity>
//             );
//         }}
//         keyExtractor={(item) => item.id.toString()}
//         contentContainerStyle={styles.listContainer}
//         showsVerticalScrollIndicator={true}
//     />
// )}

// {isLoading === false && userVehicles.length === 0 && (
//     <Text>No available vehicles...</Text>
// )}

// const [userVehicles, setUserVehicles] = useState<UserVehicles[]>([]);

// // // ✅ Add loading check for profile
// useEffect(() => {
//     if (profile?.id) {
//         setUserId(profile.id); // ✅ Ensure userId updates with profile change
//         setEmail(profile.email);
//     }
// }, [profile]); // ✅ Depend on `profile` so it updates when a new user logs in

// // if (error) {
// // Alert.alert("Error", error.message);
// // console.error("Supabase Fetch Error:", error);
// // return; // Prevent further execution
// // }

// // ✅ Fetch vehicles only when `userId` is available
// // @ts-ignore
// const { data, isLoading, error } = useVehicleList(userId);

// // useEffect(() => {
// //     if (data) {
// //         setUserVehicles(data);
// //     } else {
// //         setUserVehicles([]);
// //     }
// // }, [userId]);

// // console.log(
// //     userId,
// //     `111111111111111111111111111111111111111111111111111111111111u1serIduserIduserIduserIduserIduserIduserIduserId`
// // );
// // console.log(userVehicles, `userVehicles`);

// // return;

{
    /* <View style={styles.header}>
<Text style={styles.headerTitle}>Welcome Back, {email}!</Text>
<Text style={styles.headerSubtitle}>
    Keep track of your car's health
</Text>
</View> */
}

{
    /* Search Bar */
}
{
    /* <View style={styles.searchContainer}>
<Ionicons name="search" size={20} color="#888" />
<TextInput
    placeholder="Search..."
    placeholderTextColor="#aaa"
    style={styles.searchInput}
/>
</View> */
}

{
    /* Quick Actions */
}
{
    /* <Text style={styles.sectionTitle}>Quick Actions</Text>
<View style={styles.quickActionsContainer}>
{quickActions.map((action) => (
    <TouchableOpacity
        key={action.id}
        style={styles.quickAction}
        activeOpacity={0.65}
        onPress={() => quickActionHandler(action.name, null)}
    >
        <Ionicons name={action.icon} size={24} color="#fff" />
        <Text style={styles.quickActionText}>
            {action.name}
        </Text>
    </TouchableOpacity>
))}
</View> */
}

{
    /* Recent Items */
}
{
    /* <Text style={styles.sectionTitle}>Your Vehicles</Text>
<ScrollView
nestedScrollEnabled={true}
horizontal={true}
contentContainerStyle={styles.vehicleContainerScrollView}
>
</ScrollView> */
}

// header: {
//     marginBottom: 20,
// },
// headerTitle: {
//     fontSize: 24,
//     fontWeight: "bold",
//     color: "#333",
// },
// headerSubtitle: {
//     fontSize: 16,
//     color: "#555",
// },
// searchContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     borderRadius: 8,
//     paddingLeft: 10,
//     height: 40,
//     elevation: 2,
//     shadowColor: "#000",
//     marginBottom: 20,
// },
// searchInput: {
//     marginLeft: 8,
//     flex: 1,
//     color: "#333",
//     fontSize: 16,
// },
// sectionTitle: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#333",
//     marginVertical: 10,
// },
// quickActionsContainer: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 20,
//     flexWrap: "wrap",
//     marginVertical: 10,
// },
// quickAction: {
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#4CAF50",
//     paddingVertical: 5,
//     borderRadius: 8,
//     width: 100,
//     height: 100,
//     marginVertical: 10,
// },
// quickActionText: {
//     marginTop: 8,
//     color: "#fff",
//     fontSize: 14,
//     fontWeight: "500",
//     textAlign: "center",
// },
// listContainer: {
//     paddingVertical: 10,
// },
// listItem: {
//     backgroundColor: "#fff",
//     padding: 15,
//     borderRadius: 8,
//     marginBottom: 10,
//     elevation: 1,
//     shadowColor: "#ccc",
// },
// listItemTitle: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#333",
// },
// listItemDate: {
//     fontSize: 14,
//     color: "#666",
//     marginTop: 5,
// },
// vehicleContainerScrollView: {
//     width: "100%",
//     flex: 1,
// },
// vehiclesContainer: {
//     width: "100%",
//     flex: 1,
// },
// vehicleContainer: {
//     borderRadius: 8,
//     padding: 8,
//     backgroundColor: "white",
//     height: 160,
//     marginVertical: 15,
//     // flexDirection: 'row',
//     // width: '99%',
//     width: "100%",
//     shadowColor: "black",
//     // borderWidth: 1,
//     shadowRadius: 2,
//     elevation: 1,
// },
// vehicle: {
//     height: 25,
// },
// loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
// },
