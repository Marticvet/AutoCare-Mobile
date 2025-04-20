import React, { useContext, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Alert,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import {
    useDeleteVehicle,
    useVehicle,
    useUpdateVehicle,
} from "../api/vehicles";
import { Loader } from "./Loader";
import { useNavigation } from "@react-navigation/native";
import AddVehicleScreen from "./AddVehicleScreen";
import { ProfileContext } from "../providers/ProfileDataProvider";

const VehicleDetailScreen = ({ route }: any) => {
    const navigation = useNavigation();
    const { vehicleId } = route.params;
    const { userProfile } = useContext(ProfileContext);

    const { mutate: deleteVehicle } = useDeleteVehicle();

    const {
        data: vehicle,
        isLoading,
        error,
    } = useVehicle(userProfile?.id || "", vehicleId);
    const [modalVisible, setModalVisible] = useState(false);

    if (isLoading) return <Loader />;
    if (error) {
        Alert.alert("Error", error.message);
        return;
    }

    const handleEdit = () => {
        // @ts-ignore
        navigation.navigate("EditVehicleScreen", { vehicle: vehicle });
    };

    const handleDelete = () => {
        Alert.alert("Delete Vehicle", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                    if (!userProfile?.id) return;

                    deleteVehicle(
                        { vehicleId, userId: userProfile.id },
                        {
                            onSuccess: () => navigation.goBack(),
                            onError: (error) =>
                                console.error("Error deleting vehicle:", error),
                        }
                    );
                },
            },
        ]);
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Vehicle Information</Text>

            <View style={styles.card}>
                <Text style={styles.label}>Brand</Text>
                <Text style={styles.value}>{vehicle.vehicle_brand}</Text>

                <Text style={styles.label}>Model</Text>
                <Text style={styles.value}>{vehicle.vehicle_model}</Text>

                <Text style={styles.label}>Car Type</Text>
                <Text style={styles.value}>{vehicle.vehicle_car_type}</Text>

                <Text style={styles.label}>License Plate</Text>
                <Text style={styles.value}>
                    {vehicle.vehicle_license_plate || "—"}
                </Text>

                <Text style={styles.label}>Model Year</Text>
                <Text style={styles.value}>{vehicle.vehicle_model_year}</Text>

                <Text style={styles.label}>Year of Manufacture</Text>
                <Text style={styles.value}>
                    {vehicle.vehicle_year_of_manufacture}
                </Text>

                <Text style={styles.label}>Current Mileage</Text>
                <Text style={styles.value}>{vehicle.current_mileage} km</Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.button} onPress={handleEdit}>
                    <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.deleteButton]}
                    onPress={handleDelete}
                >
                    <Text style={[styles.buttonText, { color: "#fff" }]}>
                        Delete
                    </Text>
                </TouchableOpacity>
            </View>

            <Modal
                animationType="slide"
                transparent={false}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <AddVehicleScreen
                    {...{ modalVisible, setModalVisible, vehicle }}
                />
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: "#f9f9f9",
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        marginBottom: 20,
        color: "#333",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 4,
    },
    label: {
        fontSize: 14,
        color: "#777",
        marginTop: 10,
    },
    value: {
        fontSize: 16,
        fontWeight: "500",
        color: "#333",
    },
    actions: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 24,
    },
    button: {
        flex: 1,
        backgroundColor: "#e0e0e0",
        padding: 14,
        borderRadius: 8,
        marginHorizontal: 8,
        alignItems: "center",
    },
    deleteButton: {
        backgroundColor: "#E53935",
    },
    buttonText: {
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default VehicleDetailScreen;
