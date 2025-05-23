import React, { useContext, useState } from "react";
import {
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
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { vehicleTypeIcons } from "../utils/vehicleTypeIcons";
import { useNavigation } from "@react-navigation/native";
import { TextInput } from "react-native-gesture-handler";
import { RadioButton } from "react-native-paper";

// *
// TODO
// make a filter system to sort by name, by mileage, by model year
// */
interface SortingCriteria {
    [key: string]: {
        criteria: string;
        selected: boolean;
    };
}

export function OwnerVehiclesScreen() {
    const navigation = useNavigation();
    const { vehicles } = useContext(ProfileContext);
    const [showSortPopup, setShowSortPopup] = useState<boolean>(false);
    const [filteredVehicles, setFilteredVehicles] = useState(vehicles);
    const [searchCriteria, setSearchCriteria] = useState<string>("");
    const [sortingCriteriaObject, setSortingCriteriaObject] =
        useState<SortingCriteria>({
            increaseMileage: {
                criteria: "Mileage: Low to High",
                selected: false,
            },
            decreaseMileage: {
                criteria: "Mileage: High to Low",
                selected: false,
            },
            sortAlphabetical: {
                criteria: "Model Name: A to Z",
                selected: false,
            },
            sortReverseAlphabetical: {
                criteria: "Model Name: Z to A",
                selected: false,
            },
            increaseModelYear: {
                criteria: "Model Year: Oldest to Newest",
                selected: false,
            },
            decreaseModelYear: {
                criteria: "Model Year: Newest to Oldest",
                selected: false,
            },
        });

    const sortVehiclesByCriteriaHandler = (criteria: string) => {
        const newFilteredVehicles = [...(vehicles ?? [])].sort((a, b) => {
            if (criteria === "Mileage: Low to High") {
                return a.current_mileage - b.current_mileage;
            } else if (criteria === "Mileage: High to Low") {
                return b.current_mileage - a.current_mileage;
            } else if (criteria === "Model Name: A to Z") {
                return a.vehicle_model.localeCompare(b.vehicle_model);
            } else if (criteria === "Model Name: Z to A") {
                return b.vehicle_model.localeCompare(a.vehicle_model);
            } else if (criteria === "Model Year: Oldest to Newest") {
                return a.vehicle_model_year - b.vehicle_model_year;
            } else if (criteria === "Model Year: Newest to Oldest") {
                return b.vehicle_model_year - a.vehicle_model_year;
            }

            return 0;
        });

        setFilteredVehicles(newFilteredVehicles);

        const copiedSortingCriteriaObject = JSON.parse(
            JSON.stringify(sortingCriteriaObject)
        );

        Object.keys(copiedSortingCriteriaObject).forEach((key) => {
            if (copiedSortingCriteriaObject[key].criteria === criteria) {
                copiedSortingCriteriaObject[key] = {
                    ...copiedSortingCriteriaObject[key],
                    selected: true,
                };
            } else {
                copiedSortingCriteriaObject[key] = {
                    ...copiedSortingCriteriaObject[key],
                    selected: false,
                };
            }
        });

        setSortingCriteriaObject(copiedSortingCriteriaObject);
    };

    function searchCriteriaHandler(text: string) {
        setSearchCriteria(text);

        const newFilteredVehicles = [...(vehicles ?? [])].filter((vehicle) =>
            vehicle.vehicle_license_plate
                .toLowerCase()
                .includes(text.toLowerCase())
        );

        setFilteredVehicles(newFilteredVehicles);
    }

    function clearFiltersHandler() {
        setSearchCriteria("");

        const copiedSortingCriteriaObject = JSON.parse(
            JSON.stringify(sortingCriteriaObject)
        );

        Object.keys(copiedSortingCriteriaObject).forEach((key) => {
            {
                copiedSortingCriteriaObject[key] = {
                    ...copiedSortingCriteriaObject[key],
                    selected: false,
                };
            }
        });

        setSortingCriteriaObject(copiedSortingCriteriaObject);
        setFilteredVehicles(vehicles);
    }

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
                        {filteredVehicles && filteredVehicles?.length > 0 ? (
                            <FlatList
                                showsVerticalScrollIndicator={false}
                                showsHorizontalScrollIndicator={false}
                                data={filteredVehicles}
                                // @ts-ignore
                                keyExtractor={(item, index) =>
                                    item.id?.toString()
                                }
                                renderItem={({ item, index }) => {
                                    return (
                                        <View style={styles.cardWrapper}>
                                            <TouchableOpacity
                                                style={[styles.card]}
                                                onPress={() => {
                                                    setShowSortPopup(false);
                                                    navigation.navigate(
                                                        // @ts-ignore
                                                        "VehicleDetailScreen",
                                                        {
                                                            vehicleId: item.id,
                                                            parentScreenName:
                                                                "OwnerVehiclesScreen",
                                                        }
                                                    );
                                                }}
                                            >
                                                <View
                                                    style={
                                                        styles.titleContainer
                                                    }
                                                >
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
                                                    Odometer:{" "}
                                                    {item.current_mileage} km
                                                </Text>
                                                <Text>Next Service:</Text>
                                                <Text>Insurance Expires:</Text>
                                                <Text>Last Tire Change:</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                }}
                            />
                        ) : (
                            <View style={styles.cardWrapper}>
                                <Text style={styles.noVehiclesText}>No vehicle(s) found...</Text>
                            </View>
                        )}
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

                    <Modal
                        animationType="none"
                        transparent={true}
                        visible={showSortPopup}
                        onRequestClose={() => setShowSortPopup(false)}
                    >
                        <TouchableWithoutFeedback
                            onPress={() => {
                                Keyboard.dismiss();
                                setShowSortPopup(false);
                            }}
                        >
                            <View style={styles.modalOverlay}>
                                <TouchableWithoutFeedback
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setShowSortPopup(true);
                                    }}
                                >
                                    <View style={styles.modalContent}>
                                        <View style={styles.topContainer}>
                                            <Text
                                                style={styles.topContainerText}
                                            >
                                                Filters
                                            </Text>
                                        </View>

                                        <View style={styles.textInputContainer}>
                                            <AntDesign
                                                name="search1"
                                                size={20}
                                                color="#484747"
                                            />
                                            <TextInput
                                                value={searchCriteria}
                                                onChangeText={
                                                    searchCriteriaHandler
                                                }
                                                placeholderTextColor={"#484747"}
                                                placeholder="Vehicle's license plate..."
                                                style={styles.textInput}
                                                clearButtonMode={"always"}
                                                maxLength={50}
                                            />
                                        </View>

                                        {Object.keys(sortingCriteriaObject).map(
                                            (key) => (
                                                <Pressable
                                                    key={
                                                        sortingCriteriaObject[
                                                            key
                                                        ].criteria
                                                    }
                                                    style={
                                                        styles.sortingCriteria
                                                    }
                                                    onPress={() =>
                                                        sortVehiclesByCriteriaHandler(
                                                            sortingCriteriaObject[
                                                                key
                                                            ].criteria
                                                        )
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.sortingCriteriaText
                                                        }
                                                    >
                                                        {
                                                            sortingCriteriaObject[
                                                                key
                                                            ].criteria
                                                        }
                                                    </Text>

                                                    <RadioButton
                                                        value={
                                                            sortingCriteriaObject[
                                                                key
                                                            ].criteria
                                                        }
                                                        status={
                                                            sortingCriteriaObject[
                                                                key
                                                            ].selected
                                                                ? "checked"
                                                                : "unchecked"
                                                        }
                                                        onPress={() =>
                                                            sortVehiclesByCriteriaHandler(
                                                                sortingCriteriaObject[
                                                                    key
                                                                ].criteria
                                                            )
                                                        }
                                                        color="#4B72FA" // custom accent color
                                                    />
                                                </Pressable>
                                            )
                                        )}

                                        <View style={styles.bottomContainer}>
                                            <Pressable
                                                style={
                                                    styles.bottomContainerButton
                                                }
                                                onPress={clearFiltersHandler}
                                            >
                                                <Text
                                                    style={
                                                        styles.bottomContainerButtonText
                                                    }
                                                >
                                                    Clear
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                </TouchableWithoutFeedback>
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
        flexDirection: "row",
        alignItems: "center", // instead of "baseline"
        justifyContent: "space-between",
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    sortingCriteriaText: {
        fontSize: 18,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
        paddingHorizontal: 8,
        paddingBottom: 16,
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        // height: 320, // taller modal
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 50,
        padding: 20,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: -2 },
        shadowRadius: 10,
        elevation: 10,
        borderRadius: 16,
    },
    textInputContainer: {
        height: 48,
        marginBottom: 24,
        backgroundColor: "#f7fafb",
        alignItems: "center",
        justifyContent: "space-between",
        flexDirection: "row",
        borderRadius: 6,
        paddingLeft: 8,
        borderWidth: 1,
        borderColor: "#becfd5",
    },
    textInput: {
        // backgroundColor: "black",
        // width: "100%",
        flex: 1,
        marginLeft: 12,
        height: 42,
    },
    //// topContaine
    topContainer: {
        height: 40,
        // backgroundColor: "black",
        marginBottom: 16,
        alignContent: "center",
        justifyContent: "center",
    },
    topContainerText: {
        fontSize: 20,
        width: "100%",
        textAlign: "center",
        fontWeight: 500,
    },
    //// bottomm
    bottomContainer: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        marginTop: 16,
    },
    bottomContainerButton: {
        width: "100%",
        height: 42,
        backgroundColor: "#2e3742",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
    },
    bottomContainerButtonText: {
        color: "white",
        fontWeight: 600,
    },
    ////
    noVehiclesText: {
        fontSize: 20,
        fontWeight: 600
    }
});
