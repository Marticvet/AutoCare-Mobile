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

const years = [
    1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989, 1990, 1991,
    1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003,
    2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024,
];

const carTypesByShape: { name: string; type: number }[] = [
    { name: "Sedan", type: 1 },
    { name: "Hatchback", type: 2 },
    { name: "SUV", type: 3 },
    { name: "Convertible", type: 4 },
    { name: "Station Wagon", type: 5 },
    { name: "Pickup Truck", type: 6 },
    { name: "Van", type: 7 },
    { name: "Crossover", type: 8 },
    { name: "Sports Car", type: 9 },
    { name: "Luxury Car", type: 10 },
    { name: "Roadster", type: 11 },
    { name: "Off-Road Vehicle", type: 12 },
    { name: "Compact Car", type: 13 },
    { name: "Supercar", type: 14 },
    { name: "Electric Vehicle", type: 15 },
    { name: "Liftback", type: 16 },
    { name: "Targa", type: 17 },
    { name: "Ute (Utility Vehicle)", type: 18 },
    { name: "Campervan", type: 19 },
    { name: "Panel Van", type: 20 },
    { name: "Coupe", type: 21 },
    { name: "Minivan", type: 22 },
    { name: "Microcar", type: 23 },
];

const API_BASE_URL = "https://www.carqueryapi.com/api/0.3/";

interface Brands {
    make_country: string;
    make_display: string;
    make_id: string;
    make_is_common: string;
}

interface Models {
    model_name: string | null;
}

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

    // const addVehicleData: VehicleData = {
    //     vehicle_brand: "BMW",
    //     vehicle_model: "330",
    //     vehicle_car_type: "sedan",
    //     vehicle_model_year: 2021,
    //     vehicle_license_plate: "HU-MT7927",
    //     vehicle_year_of_manufacture: 2020,
    //     vehicle_identification_number: "",
    //     current_mileage: 30212,
    //     user_id: userId,
    // };

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
                const response = await fetch(`${API_BASE_URL}?cmd=getMakes`);
                const data = await response.json();
                const filteredData = data.Makes.filter(
                    (brand: Brands) => Number(brand.make_is_common) > 0
                );

                // Store to AsyncStorage
                await AsyncStorage.setItem(
                    "brands",
                    JSON.stringify(filteredData)
                );

                setBrands(filteredData);
                setSelectedVehicleBrand(filteredData[0]?.make_display ?? "");
            } catch (error) {
                console.error("Error fetching brands:", error);
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
                const response = await fetch(
                    `${API_BASE_URL}?cmd=getModels&make=${selectedVehicleBrand}`
                );
                const data = await response.json();

                if (
                    JSON.stringify(previousModels.current) !==
                    JSON.stringify(data.Models)
                ) {
                    // Store in AsyncStorage only if models changed
                    await AsyncStorage.setItem(
                        cacheKey,
                        JSON.stringify(data.Models)
                    );
                    setModels(data.Models || []);
                    previousModels.current = data.Models;
                }
            } catch (error) {
                console.error(
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
        // if (
        //     !selectedVehicleBrand.trim() ||
        //     !selectedModel.trim() ||
        //     !selectedCarType.trim() ||
        //     !vehicleLicensePlate.trim() ||
        //     !yearOfManufacture // Check if it's 0 or undefined
        // ) {
        //     Alert.alert(
        //         "Error",
        //         "Please fill in all required fields before proceeding."
        //     );
        //     return false;
        // }

        // @ts-ignore
        mutate(addVehicleData, {
            onSuccess: () => {
                console.log("Vehicle added successfully!");
                navigation.goBack();
            },
            // @ts-ignore
            onError: (err) => {
                console.error("Error inserting vehicle:", err.message);
            },
        });
    };

    if (error) {
        Alert.alert(error.message);
    }

    if (isPending) {
        Alert.alert("Inserting vehicle...");
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
                                        onValueChange={(value: string) =>
                                            handlePickerChange("brand", value)
                                        }
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
                                    items={carTypesByShape.map(
                                        (carType) => carType.name
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
