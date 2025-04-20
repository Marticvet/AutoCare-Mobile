import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, Modal, Alert } from "react-native";
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
    const { mutate: updateVehicle } = useUpdateVehicle();

    // ✅ Fetch vehicle only when `userProfile?.id` and vehicleId is available
    const {
        data: vehicle,
        isLoading,
        error,
    } = useVehicle(userProfile?.id || "", vehicleId);
    const [modalVisible, setModalVisible] = useState(false);

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        Alert.alert("Error", error.message);
        console.error("Supabase Fetch Error:", error);
        return; // Prevent further execution
    }

    function editVehicleDetailsHandler() {
        if (!vehicle || !vehicleId || !userProfile?.id) {
            console.error("🚨 Missing required values. Cannot update vehicle.");
            return;
        }

        updateVehicle(
            {
                vehicle,
                vehicleId,
                userId: userProfile?.id,
            },
            {
                onSuccess: () => {
                    console.log("✅ Vehicle updated successfully!");
                    navigation.goBack(); // ✅ Navigate back after update
                },
                onError: (error) => {
                    console.error("🚨 Error updating vehicle:", error);
                },
            }
        );
    }

    async function deleteVehicleHandler() {
        Alert.alert(
            "Delete Vehicle",
            "Are you sure you want to delete this vehicle?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    onPress: () => {
                        if (!userProfile?.id) {
                            console.error(
                                "🚨 User ID is missing. Cannot delete vehicle."
                            );
                            return;
                        }

                        deleteVehicle(
                            { vehicleId, userId: userProfile?.id }, // ✅ Now passing userProfile?.id as a parameter
                            {
                                onSuccess: () => {
                                    navigation.goBack();

                                    console.log(
                                        "✅ Vehicle deleted successfully!"
                                    );
                                    // Optionally navigate back or refresh the list
                                },
                                onError: (error) => {
                                    console.error(
                                        "🚨 Error deleting vehicle:",
                                        error
                                    );
                                },
                            }
                        );
                    },
                    style: "destructive",
                },
            ]
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Vehicle Details</Text>
            <View style={styles.vehicleContainer}>
                <Text style={styles.vehicle}>
                    Vehicle Brand: {vehicle.vehicle_brand}
                </Text>
                <Text style={styles.vehicle}>
                    Vehicle Type: {vehicle.vehicle_car_type}
                </Text>
                <Text style={styles.vehicle}>
                    Vehicle License Plate: {vehicle.vehicle_license_plate}
                </Text>
                <Text style={styles.vehicle}>
                    Vehicle Model: {vehicle.vehicle_model}
                </Text>
                <Text style={styles.vehicle}>
                    Vehicle Model Year: {vehicle.vehicle_model_year}
                </Text>
                <Text style={styles.vehicle}>
                    Vehicle Year Of Manufacture:{" "}
                    {vehicle.vehicle_year_of_manufacture}
                </Text>
            </View>

            <View style={styles.detailsButtonContainer}>
                <Text style={styles.detailButton}>Add Details</Text>
                <Text
                    style={styles.detailButton}
                    onPress={editVehicleDetailsHandler}
                >
                    Edit Details
                </Text>
            </View>

            <Text style={styles.detailButton} onPress={deleteVehicleHandler}>
                Delete
            </Text>

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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        width: "100%",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
    },
    vehicleInfo: {
        marginTop: 15,
        backgroundColor: "#fff",
        padding: 15,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    subtitle: {
        fontSize: 18,
        color: "#555",
    },
    infoItem: {
        fontSize: 16,
        color: "#777",
    },
    vehicleContainer: {
        borderRadius: 8,
        padding: 8,
        backgroundColor: "white",
        height: 160,
        marginVertical: 15,
        // flexDirection: 'row',
        // width: '99%',
        width: "100%",
        shadowColor: "black",
        // borderWidth: 1,
        shadowRadius: 2,
        elevation: 1,
    },
    vehicle: {
        height: 25,
    },
    detailsButtonContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    detailButton: {
        width: "45%",
        height: 40,
        backgroundColor: "white",
        marginHorizontal: 16,
        textAlign: "center",
        textAlignVertical: "center",
        borderRadius: 8,
    },
    modalContainer: {
        width: "90%",
        height: "90%",
        padding: 16,
    },
    textStyle: {
        color: "black",
        fontWeight: "bold",
        textAlign: "center",
    },
    detailButtonText: { color: "white", fontWeight: "bold" },
    closeButton: {
        padding: 10,
        backgroundColor: "#ff4d4d",
        marginTop: 20,
        borderRadius: 8,
        alignItems: "center",
    },
    closeButtonText: { color: "white", fontWeight: "bold" },
});

export default VehicleDetailScreen;
