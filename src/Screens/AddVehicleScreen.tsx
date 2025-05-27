import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Pressable,
    ScrollView,
    TouchableWithoutFeedback,
    Platform,
    KeyboardAvoidingView,
    Alert,
    SafeAreaView,
    Keyboard,
} from "react-native";
import { useState, useEffect, useRef, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { useInsertVehicle } from "../api/vehicles";
import { VehicleData } from "../../types/vehicle";
import CustomPicker from "./CustomPicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProfileContext } from "../providers/ProfileDataProvider";
import { carBodyTypes } from "../utils/carBodyTypes";
import { years } from "../utils/years";
import { Brands } from "../../types/Brands";
import { Models } from "../../types/Models";
import { getCarMake, getCarMakeModels } from "../api/fetchCarsApi/fetchCarsApi";
import { Loader } from "./Loader";

function AddVehicleScreen(props: any) {
    const { userProfile } = useContext(ProfileContext);
    const userId = userProfile?.id;
    const { modalVisible, setModalVisible } = props;
    const navigation = useNavigation();
    const [selectedVehicleBrand, setSelectedVehicleBrand] =
        useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [selectedYear, setSelectedYear] = useState<number>(2024);
    const [selectedCarType, setSelectedCarType] = useState<string>("");
    const [vehicleLicensePlate, setVehicleLicensePlate] = useState<string>("");
    const [yearOfManufacture, setYearOfManufacture] = useState<number>(0);
    const [vehicleIdentificationNumber, setVehicleIdentificationNumber] =
        useState<string>("");
    const [vehicleCurrentMileage, setVehicleCurrentMileage] =
        useState<number>(0);

    const { mutate, isPending, error } = useInsertVehicle(); // ✅ Call Hook at the top level

    const addVehicleData: VehicleData = {
        vehicle_brand: selectedVehicleBrand,
        vehicle_model: selectedModel,
        vehicle_car_type: selectedCarType,
        vehicle_model_year: selectedYear,
        vehicle_license_plate: vehicleLicensePlate,
        vehicle_year_of_manufacture: yearOfManufacture,
        vehicle_identification_number: vehicleIdentificationNumber,
        current_mileage: vehicleCurrentMileage,
        user_id: userId,
    };

    const [brands, setBrands] = useState<Brands[]>([]);
    const [models, setModels] = useState<Models[]>([]);

    // Store last fetched brands/models to prevent unnecessary re-fetching
    const previousBrands = useRef<Brands[]>([]);
    const previousModels = useRef<Models[]>([]);

    /** Fetch Brands Once & Store in AsyncStorage */
    useEffect(() => {
        async function fetchBrands() {
            try {
                const cachedBrands = await AsyncStorage.getItem("brands");
                if (cachedBrands) {
                    console.log("Using cached brands...");
                    setBrands(JSON.parse(cachedBrands));
                    return;
                }

                console.log("Fetching brands...");
                const filteredData = await getCarMake();

                console.log(filteredData, "filteredData");
                
                // Store to AsyncStorage
                await AsyncStorage.setItem(
                    "brands",
                    JSON.stringify(filteredData)
                );

                setBrands(filteredData);
                setSelectedVehicleBrand(filteredData[0]?.make_display ?? "");
            } catch (error) {
                console.warn("Error fetching brands:", error);
            }
        }

        fetchBrands();
    }, []);

    /** Fetch Models Only When Brand Changes */
    useEffect(() => {
        async function fetchModels() {
            if (!selectedVehicleBrand) return;

            setSelectedModel("");

            try {
                const cacheKey = `models-${selectedVehicleBrand}`;
                const cachedModels = await AsyncStorage.getItem(cacheKey);

                if (cachedModels) {
                    console.log(
                        `Using cached models for ${selectedVehicleBrand}`
                    );
                    setModels(JSON.parse(cachedModels));
                    return;
                }

                console.log(`Fetching models for ${selectedVehicleBrand}...`);
                const models = await getCarMakeModels(selectedVehicleBrand);

                if (
                    JSON.stringify(previousModels.current) !==
                    JSON.stringify(models)
                ) {
                    // Store in AsyncStorage only if models changed
                    await AsyncStorage.setItem(
                        cacheKey,
                        JSON.stringify(models)
                    );

                    setModels(models || []);
                    previousModels.current = models;
                }
            } catch (error) {
                console.warn(
                    `Error fetching models for ${selectedVehicleBrand}:`,
                    error
                );
            }
        }

        fetchModels();
    }, [selectedVehicleBrand]);

    const handlePickerChange = (field: string, value: string) => {
        if (field === "brand") {
            setSelectedVehicleBrand(value);
            setSelectedYear(2024);
        } else if (field === "model") {
            setSelectedYear(2024);
            setSelectedModel(value);
        } else if (field === "year") {
            setSelectedYear(Number(value));
        } else if (field === "carType") {
            setSelectedCarType(value);
        } else if (field === "vehicleLicense") {
            setVehicleLicensePlate(value);
        } else if (field === "yearOfManufacture") {
            setYearOfManufacture(Number(value));
        } else if (field === "vin") {
            setVehicleIdentificationNumber(value);
        } else if (field === "mileage") {
            setVehicleCurrentMileage(Number(value));
        }
    };

    const addVehicleHandler = () => {
        if (
            !selectedVehicleBrand.trim() ||
            !selectedModel.trim() ||
            !selectedCarType.trim() ||
            !vehicleLicensePlate.trim() ||
            !yearOfManufacture // Check if it's 0 or undefined
        ) {
            Alert.alert(
                "Error",
                "Please fill in all required fields before proceeding."
            );
            return false;
        }

        // @ts-ignore
        mutate(addVehicleData, {
            onSuccess: () => {
                console.log("Vehicle added successfully!");
                navigation.goBack();
            },
            // @ts-ignore
            onError: (err) => {
                console.warn("Error inserting vehicle:", err.message);
            },
        });
    };

    if (error) {
        Alert.alert(error.message);
    }

    if (isPending) {
        // Alert.alert("Inserting vehicle...");
        return <Loader text="Inserting vehicle..."/>
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.container}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Brand Picker */}

                        <View style={styles.pickerContainer}>
                            <View style={styles.pickerWrapper}>
                                <CustomPicker
                                    items={brands.map(
                                        (brand) => brand.make_display
                                    )}
                                    selectedValue={selectedVehicleBrand}
                                    onValueChange={(value: string) =>
                                        handlePickerChange("brand", value)
                                    }
                                    label="Vehicle Brand"
                                    placeholder={"Select a brand"}
                                />
                            </View>
                        </View>

                        {/* Model Picker */}
                        <View style={styles.pickerContainer}>
                            <View style={styles.pickerWrapper}>
                                <CustomPicker
                                    items={models.map(
                                        (model) => model.model_name || "Unknown"
                                    )}
                                    selectedValue={selectedModel}
                                    onValueChange={(value: string) =>
                                        handlePickerChange("model", value)
                                    }
                                    label="Model"
                                    placeholder={"Select a model"}
                                />
                            </View>
                        </View>

                        {/* Year Picker */}
                        <View style={styles.pickerContainer}>
                            <View style={styles.pickerWrapper}>
                                <CustomPicker
                                    items={years
                                        .map((year) => year.toString())
                                        .reverse()}
                                    selectedValue={selectedYear.toString()}
                                    onValueChange={(value: string) =>
                                        handlePickerChange("year", value)
                                    }
                                    label="Year"
                                    placeholder={"Select a year"}
                                />
                            </View>
                        </View>

                        {/* Vehicle Type Picker */}
                        <View style={styles.pickerContainer}>
                            <View style={styles.pickerWrapper}>
                                <CustomPicker
                                    items={carBodyTypes.map(
                                        (carType) => carType
                                    )}
                                    selectedValue={selectedCarType}
                                    onValueChange={(value: string) =>
                                        handlePickerChange("carType", value)
                                    }
                                    label="Vehicle Type"
                                    placeholder={"Select a car type"}
                                />
                            </View>
                        </View>

                        {/* Additional Inputs */}
                        <View style={styles.additionalInputsContainer}>
                            <Text style={styles.label}>
                                Vehicle License Plate:
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter License Plate"
                                onChangeText={(value) =>
                                    handlePickerChange("vehicleLicense", value)
                                }
                                autoCapitalize="characters"
                                clearButtonMode={"always"}
                            />

                            <Text style={styles.label}>
                                Year of Manufacture:
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter a Year Of Manufacturing"
                                keyboardType="numeric"
                                onChangeText={(value) =>
                                    handlePickerChange(
                                        "yearOfManufacture",
                                        value
                                    )
                                }
                                clearButtonMode={"always"}
                            />

                            <Text style={styles.label}>
                                Vehicle Identification Number (VIN): (Optional)
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your VIN"
                                onChangeText={(value) =>
                                    handlePickerChange("vin", value)
                                }
                                autoCapitalize="none"
                                clearButtonMode={"always"}
                            />

                            <Text style={styles.label}>
                                Vehicle Current Mileage: (Optional)
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your mileage"
                                keyboardType="numeric"
                                onChangeText={(value) =>
                                    handlePickerChange("mileage", value)
                                }
                                clearButtonMode={"always"}
                            />

                            {/* Close Button */}
                            {modalVisible && (
                                <Pressable
                                    style={[
                                        styles.saveButton,
                                        styles.closeButton,
                                    ]}
                                    // activeOpacity={0.65}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.buttonText}>
                                        Cancel Editing
                                    </Text>
                                </Pressable>
                            )}

                            {/* Submit Button */}
                            <Pressable
                                style={styles.saveButton}
                                // activeOpacity={0.65}
                                onPress={addVehicleHandler}
                            >
                                <Text style={styles.buttonText}>
                                    Save Vehicle
                                </Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: "white",
        paddingHorizontal: 25,
        paddingBottom: 50,
    },
    label: {
        fontSize: 16,
        marginVertical: 5,
        color: "#333",
    },
    input: {
        height: 45,
        marginBottom: 20,
        backgroundColor: "#fff",
        borderColor: "#2d2a2a5e",
        borderBottomWidth: 1,
        color: "#333", // Text color inside the picker
    },
    pickerContainer: {
        marginBottom: 20,
    },
    buttonText: {
        color: "#fff",
        textAlign: "center",
        fontSize: 18,
    },
    saveButton: {
        backgroundColor: "#625be7",
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
    },
    additionalInputsContainer: {
        marginVertical: 25,
        marginTop: 10,
    },
    pickerWrapper: {
        backgroundColor: "#fff",
        borderColor: "#2d2a2a5e",
        overflow: "hidden", // Ensures rounded corners
        borderBottomWidth: 1,
    },
    pickerMenu: {
        height: 50,
        color: "#333", // Text color inside the picker
    },
    closeButton: {
        backgroundColor: "red",
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
    },
});

export default AddVehicleScreen;
