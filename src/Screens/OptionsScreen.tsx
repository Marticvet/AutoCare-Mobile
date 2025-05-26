import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ScrollView,
    SafeAreaView,
    SectionList,
} from "react-native";
import { useAuth } from "../providers/AuthProvider";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const DATA = [
    {
        title: "General",
        data: [
            {
                title: "My Profile",
                screen: "MyProfileScreen",
                icon: "account-circle",
            }, // MaterialIcons
            {
                title: "Synchronize data",
                screen: "SyncDataScreen",
                icon: "cloud-sync",
            }, // MaterialCommunityIcons
            { title: "Storage", screen: "StorageScreen", icon: "database" }, // FontAwesome
        ],
    },
    {
        title: "Vehicles",
        data: [
            { title: "Vehicles", screen: "OwnerVehiclesScreen", icon: "car" }, // FontAwesome
            { title: "Users", screen: "UsersScreen", icon: "account-multiple" }, // MaterialCommunityIcons
            {
                title: "Vehicle / User",
                screen: "VehicleUserScreen",
                icon: "car-multiple",
            }, // MaterialCommunityIcons
        ],
    },
    {
        title: "Fuel & Places",
        data: [
            { title: "Fuel", screen: "FuelTypeScreen", icon: "fuel" }, // MaterialCommunityIcons
            {
                title: "Gas stations",
                screen: "GasStationsScreen",
                icon: "gas-station",
            }, // MaterialCommunityIcons
            { title: "Places", screen: "PlacesScreen", icon: "map-marker" }, // FontAwesome
        ],
    },
    {
        title: "Finance",
        data: [
            {
                title: "Types of service",
                screen: "TypesOfServiceScreen",
                icon: "wrench",
            }, // FontAwesome
            {
                title: "Types of expense",
                screen: "TypesOfExpenseScreen",
                icon: "credit-card",
            }, // FontAwesome
            {
                title: "Type of income",
                screen: "TypeOfIncomeScreen",
                icon: "cash-multiple",
            }, // MaterialCommunityIcons
            { title: "Reasons", screen: "ReasonsScreen", icon: "briefcase" }, // FontAwesome
        ],
    },
];

function OptionsScreen() {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            <SectionList
                sections={DATA}
                keyExtractor={(item) => item.screen}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => {
                            // @ts-ignore
                            navigation.navigate(item.screen);
                        }}
                    >
                        <MaterialCommunityIcons
                            // @ts-ignore
                            name={item.icon}
                            size={24}
                            color="#6c6b6b"
                            style={styles.icon}
                        />
                        <Text style={styles.title}>{item.title}</Text>
                    </TouchableOpacity>
                )}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.header}>{title}</Text>
                )}
            />
        </SafeAreaView>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        margin: 12,
    },
    item: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        marginVertical: 8,
    },
    header: {
        fontSize: 24,
        borderBottomColor: "#6c6b6b",
        borderBottomWidth: 1,
        paddingBottom: 8,
    },
    title: {
        fontSize: 18,
    },
    icon: {
        marginRight: 12,
    },
});

export default OptionsScreen;
