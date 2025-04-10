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
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useContext, useEffect, useState } from "react";
import React from "react";
import { useAuth } from "../providers/AuthProvider";
import { ProfileContext } from "../providers/ProfileDataProvider";
import HomeScreenDropdown from "./HomeScreenDropdown";

function HomeScreen() {
    const navigation = useNavigation();

    // Retrieve the values provided by ProfileDataProvider
    const {
        selectedVehicle,
        vehicles,
    } = useContext(ProfileContext);

    function navigateTo() {
        // @ts-ignore
        navigation.navigate("ReminderScreen");
    }

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            nestedScrollEnabled={true}
        >
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
                {/* Other components, such as pickers or buttons, can go here */}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 16,
        backgroundColor: "#f5f5f5",
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

// function quickActionHandler(buttonTxt: string, vehicleId: number | null) {
//     if (buttonTxt === "Add Vehicle") {
//         // @ts-ignore
//         navigation.navigate("AddVehicleScreen");
//     } else if (buttonTxt === "Get Vehicle By Id") {
//         // @ts-ignore
//         navigation.navigate("GetVehicleById", {
//             vehicleId: vehicleId,
//         });
//     }
// }

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
