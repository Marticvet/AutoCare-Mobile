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
    SafeAreaView,
    Keyboard,
    Alert,
} from "react-native";
import { useState, useEffect, useRef, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { useUpdateVehicle } from "../api/vehicles";
import { VehicleData } from "../../types/vehicle";
import CustomPicker from "./CustomPicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProfileContext } from "../providers/ProfileDataProvider";
import { Loader } from "./Loader";
import { years } from "../utils/years";
import { carBodyTypes } from "../utils/carBodyTypes";
import { Brands } from "../../types/Brands";
import { Models } from "../../types/Models";
import { getCarMake, getCarMakeModels } from "../api/fetchCarsApi/fetchCarsApi";

function EditVehicleScreen({ route }: any) {
    const { userProfile } = useContext(ProfileContext);
    const userId = userProfile?.id;
    const { vehicle } = route.params;

    if (!vehicle) {
        return <Loader text={"Vehicle's data is loading..."}/>;
    }

    const navigation = useNavigation();
    const [selectedVehicleBrand, setSelectedVehicleBrand] = useState<string>(
        vehicle.vehicle_brand
    );
    const [selectedModel, setSelectedModel] = useState<string>(
        vehicle.vehicle_model
    );

    const [selectedCarType, setSelectedCarType] = useState<string>(
        vehicle.vehicle_car_type
    );
    const [vehicleLicensePlate, setVehicleLicensePlate] = useState<string>(
        vehicle.vehicle_license_plate
    );

    const [vehicleIdentificationNumber, setVehicleIdentificationNumber] =
        useState<string>(vehicle.vehicle_identification_number);

    const [selectedYear, setSelectedYear] = useState<string>(
        vehicle.vehicle_model_year.toString()
    );
    const [yearOfManufacture, setYearOfManufacture] = useState<string>(
        vehicle.vehicle_year_of_manufacture.toString()
    );
    const [vehicleCurrentMileage, setVehicleCurrentMileage] = useState<string>(
        vehicle.current_mileage.toString()
    );

    const [refreshModel, setRefreshModel] = useState<boolean>(false);

    const { mutate: updateVehicle, isPending } = useUpdateVehicle();

    const updateVehicleData: VehicleData = {
        vehicle_brand: selectedVehicleBrand,
        vehicle_model: selectedModel,
        vehicle_car_type: selectedCarType,
        vehicle_model_year: Number(selectedYear),
        vehicle_license_plate: vehicleLicensePlate,
        vehicle_year_of_manufacture: Number(yearOfManufacture),
        vehicle_identification_number: vehicleIdentificationNumber,
        current_mileage: Number(vehicleCurrentMileage),
        user_id: userId,
    };

    const [brands, setBrands] = useState<Brands[]>([]);
    const [models, setModels] = useState<Models[]>([]);

    // Store last fetched brands/models to prevent unnecessary re-fetching
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
            if (!selectedVehicleBrand || !refreshModel) return;

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
                const models = await getCarMakeModels(selectedCarType);

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
    }, [selectedVehicleBrand, refreshModel]);

    const handlePickerChange = (field: string, value: string) => {
        if (field === "brand") {
            setSelectedVehicleBrand(value);
            setSelectedYear("2024");
        } else if (field === "model") {
            setSelectedYear("2024");
            setSelectedModel(value);
        } else if (field === "year") {
            setSelectedYear(value);
        } else if (field === "carType") {
            setSelectedCarType(value);
        } else if (field === "vehicleLicense") {
            setVehicleLicensePlate(value);
        } else if (field === "yearOfManufacture") {
            setYearOfManufacture(value);
        } else if (field === "vin") {
            setVehicleIdentificationNumber(value);
        } else if (field === "mileage") {
            setVehicleCurrentMileage(value);
        }
    };

    const updateVehicleHandler = () => {
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
        updateVehicle(
            {
                vehicle: updateVehicleData,
                vehicleId: vehicle.id,
                userId: userId ?? "",
            },
            {
                onSuccess: () => navigation.goBack(),
                // @ts-ignore
                onError: (error) =>
                    console.warn("Error updating vehicle:", error),
            }
        );
    };

    if(isPending){
        return <Loader text={"Vehicle's data is updating..."}/>
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
                        {brands.length > 0 && (
                            <View style={styles.pickerContainer}>
                                <View style={styles.pickerWrapper}>
                                    <CustomPicker
                                        items={brands.map(
                                            (brand) => brand.make_display
                                        )}
                                        selectedValue={selectedVehicleBrand}
                                        onValueChange={(value: string) => {
                                            handlePickerChange("brand", value);
                                            setRefreshModel(true);
                                        }}
                                        label="Vehicle Brand"
                                        placeholder={"Select a brand"}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Model Picker */}
                        <View style={styles.pickerContainer}>
                            <View style={styles.pickerWrapper}>
                                <CustomPicker
                                    items={models.map(
                                        (model) => model.model_name || "Unknown"
                                    )}
                                    selectedValue={selectedModel}
                                    onValueChange={(value: string) => {
                                        handlePickerChange("model", value);
                                        setRefreshModel(true);
                                    }}
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
                                    selectedValue={selectedYear}
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
                                value={vehicleLicensePlate}
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
                                value={yearOfManufacture}
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
                                value={vehicleIdentificationNumber}
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
                                value={vehicleCurrentMileage}
                                placeholder="Enter your mileage"
                                keyboardType="numeric"
                                onChangeText={(value) =>
                                    handlePickerChange("mileage", value)
                                }
                                clearButtonMode={"always"}
                            />

                            {/* Submit Button */}
                            <Pressable
                                style={styles.saveButton}
                                // activeOpacity={0.65}
                                onPress={updateVehicleHandler}
                            >
                                <Text style={styles.buttonText}>
                                    Update Vehicle
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

export default EditVehicleScreen;
