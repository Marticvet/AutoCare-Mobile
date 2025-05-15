import { useContext, useState } from "react";
import {
    ScrollView,
    Text,
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    Pressable,
    Modal,
} from "react-native";
import { ProfileContext } from "../providers/ProfileDataProvider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vehicleTypeIcons } from "../utils/vehicleTypeIcons";
import { VehicleData } from "../../types/vehicle";

// *
// TODO
// make a filter system to sort by name, by mileage, by model year
// */

const sortingCriteriasArray: string[] = [
    "Sort by mileage increase",
    "Sort by mileage decrease",
    "Sort by model name A-Z",
    "Sort by model name Z-A",
    "Sort by model year increase",
    "Sort by model year decrease",
];

export function OwnerVehiclesScreen() {
    const { vehicles } = useContext(ProfileContext);
    const [showSortPopup, setShowSortPopup] = useState<boolean>(false);
    const [filteredVehicles, setFilteredVehicles] = useState<VehicleData[]>(
        vehicles ?? []
    );

    const sortVehiclesByCriteriaHandler = (criteria: string) => {
        const newFilteredVehicles = [...(vehicles ?? [])].sort((a, b) => {
            if (criteria === "Sort by mileage increase") {
                return a.current_mileage - b.current_mileage;
            } else if (criteria === "Sort by mileage decrease") {
                return b.current_mileage - a.current_mileage;
            } else if (criteria === "Sort by model name A-Z") {
                return a.vehicle_model.localeCompare(b.vehicle_model);
            } else if (criteria === "Sort by model name Z-A") {
                return b.vehicle_model.localeCompare(a.vehicle_model);
            } else if (criteria === "Sort by model year increase") {
                return a.vehicle_model_year - b.vehicle_model_year;
            } else if (criteria === "Sort by model year decrease") {
                return b.vehicle_model_year - a.vehicle_model_year;
            }

            return 0;
        });

        setFilteredVehicles(newFilteredVehicles);
        setShowSortPopup(false);
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <TouchableWithoutFeedback
                onPress={() => {
                    Keyboard.dismiss;
                    setShowSortPopup(false);
                }}
            >
                <View style={styles.container}>
                    <View style={styles.vehiclesSection}>
                        <FlatList
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                            data={filteredVehicles}
                            // @ts-ignore
                            keyExtractor={(item, index) => item.id?.toString()}
                            renderItem={({ item, index }) => {
                                return (
                                    <View style={styles.cardWrapper}>
                                        <TouchableOpacity
                                            style={[styles.card]}
                                            onPress={() => {
                                                setShowSortPopup(false);
                                            }}
                                        >
                                            <View style={styles.titleContainer}>
                                                <Text style={styles.title}>
                                                    {item.vehicle_brand}{" "}
                                                    {item.vehicle_model}
                                                </Text>
                                                <MaterialCommunityIcons
                                                    //@ts-ignore
                                                    name={
                                                        vehicleTypeIcons[
                                                            item
                                                                .vehicle_car_type
                                                        ] || "car"
                                                    }
                                                    size={24}
                                                    color="#6c6b6b"
                                                />
                                            </View>

                                            <Text>
                                                Odometer: {item.current_mileage}{" "}
                                                km
                                            </Text>
                                            <Text>Next Service:</Text>
                                            <Text>Insurance Expires:</Text>
                                            <Text>Last Tire Change:</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            }}
                        />
                    </View>

                    <View>
                        <MaterialCommunityIcons
                            name="sort-variant"
                            size={24}
                            color="#6c6b6b"
                            onPress={() => {
                                setShowSortPopup(!showSortPopup);
                            }}
                        />
                    </View>

                    {/* {showSortPopup && (
                        <View style={styles.sortingContainer}>
                            <Pressable
                                onPress={() => {
                                    setShowSortPopup(true);
                                }}
                            >
                                {sortingCriteriasArray.map((criteria) => {
                                    return (
                                        <View
                                            style={styles.sortingCriteria}
                                            key={criteria}
                                        >
                                            <Text
                                                style={
                                                    styles.sortingCriteriaText
                                                }
                                                onPress={() =>
                                                    sortVehiclesByCriteriaHandler(
                                                        criteria
                                                    )
                                                }
                                            >
                                                {criteria}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </Pressable>
                        </View>
                    )} */}

                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={showSortPopup}
                        onRequestClose={() => setShowSortPopup(false)}
                    >
                        <TouchableWithoutFeedback
                            onPress={() => setShowSortPopup(false)}
                        >
                            <View style={styles.modalOverlay}>
                                <View style={styles.modalContent}>
                                    {sortingCriteriasArray.map((criteria) => (
                                        <Pressable
                                            key={criteria}
                                            style={styles.sortingCriteria}
                                            onPress={() =>
                                                sortVehiclesByCriteriaHandler(
                                                    criteria
                                                )
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.sortingCriteriaText
                                                }
                                            >
                                                {criteria}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 40,
        paddingHorizontal: 20,
        backgroundColor: "#fff",
        flexDirection: "row",
        justifyContent: "space-between",
    },
    vehiclesSection: {
        // alignItems: "center",
        marginBottom: 30,
        width: "90%",
        position: "relative",
    },
    card: {
        // width: ITEM_WIDTH,
        // height: ITEM_HEIGHT,
        borderRadius: 16,
        backgroundColor: "#f8f8f8",
        padding: 16,
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 3,
        marginBottom: 48,
    },
    titleContainer: {
        flexDirection: "row",
        alignItems: "center", // vertical centering
        gap: 6, // spacing between text and icon (RN 0.71+)
        paddingBottom: 8,
    },

    title: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#00AFCF",
        marginRight: 6, // manually add spacing before the icon
    },

    ////// vehicles error
    errorVehiclesContainer: {
        flex: 1,
        alignContent: "center",
        justifyContent: "center",
        // flexDirection: "row",
    },
    errorVehiclesText: {
        textAlign: "center",
        fontSize: 18,
        color: "#e64848",
        fontWeight: 600,
    },
    cardWrapper: {
        // width: ITEM_WIDTH,
        ////// this makes the carouse in the middle
        // justifyContent: "center",
        // alignItems: "center",
    },
    sortingContainer: {
        // position: "absolute",
        // top: 40,
        // right: 60,
        // left: 20,
        // width: "89.5%",
        // bottom: 0,
        // width: "100%",
        // paddingBottom: 50,
    },
    sortingCriteria: {
        height: 40,
    },
    sortingCriteriaText: {
        fontSize: 18,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: 320, // taller modal
        paddingHorizontal: 24,
        paddingTop: 30,
        paddingBottom: 50,
    }
    
    
});
