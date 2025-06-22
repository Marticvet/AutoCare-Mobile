import {
    FontAwesome5,
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons,
} from "@expo/vector-icons";
import { useContext, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Switch,
    Alert,
} from "react-native";
import { useUpdateVehicle } from "../api/vehicles";
import { ProfileContext } from "../providers/ProfileDataProvider";
import { useInsertFuelExpense } from "../api/fuel_expenses";
import { DateType } from "react-native-ui-datepicker";
import { Fuel_Expenses } from "../../types/fuel_expenses";
import { DateTimePickerModal } from "./DateTimePickerModal";
import { useNavigation } from "@react-navigation/native";
import { formattedDate, formattedTime } from "../../types/formatteddateTime";
import { handleAttachFileAndUpload } from "../utils/handleAttachFileAndUpload";

import * as DocumentPicker from "expo-document-picker";

export const FuelExpenseScreen = () => {
    const { mutate: updateVehicle } = useUpdateVehicle();
    const { userProfile, selectedVehicle } = useContext(ProfileContext);
    const navigation = useNavigation<any>();
    const { mutate, isPending, error } = useInsertFuelExpense(); // ✅ Call Hook at the top level
    // Retrieve the values provided by ProfileDataProvider

    const [selectedDateTime, setSelectedDateTime] = useState<DateType>();
    const [modalVisible, setModalVisible] = useState(false);

    const [odometer, setOdometer] = useState<string>("");
    const [fuelType, setFuelType] = useState<string>("");
    const [pricePerLiter, setPricePerLiter] = useState<string>("");
    const [totalCost, setTotalCost] = useState<string>("");
    const [litres, setLitres] = useState<string>("");
    const [place, setPlace] = useState();
    const [paymentMethod, setPaymentMethod] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [locationName, setLocationName] = useState<string>("");
    const [attachment, setAttachment] = useState<{
        uri: string;
        name: string;
        mimeType: string;
    } | null>(null);

    // References for each input field to manage focus
    const odometerRef = useRef(null);
    const fuelTypeRef = useRef(null);
    const pricePerLiterRef = useRef(null);
    const totalCostRef = useRef(null);
    const litresRef = useRef(null);
    const placeRef = useRef(null);
    const paymentMethodRef = useRef(null);
    const notesRef = useRef(null);

    const [selectedDate, setSelectedDate] = useState<DateType>(formattedDate);
    const [selectedTime, setSelectedTime] = useState<DateType>(formattedTime);

    const [isEnabled, setIsEnabled] = useState(false);
    const toggleSwitch = () => setIsEnabled((previousState) => !previousState);

    const addFuelExpenseHandler = () => {
        const addFuelExpense: Fuel_Expenses = {
            odometer:
                odometer !== ""
                    ? Number(odometer)
                    : selectedVehicle?.current_mileage,
            fuel_type: fuelType,
            price_liter: Number(pricePerLiter),
            total_cost: Number(totalCost),
            total_litres: Number(litres),
            full_tank: isEnabled,
            gas_station: JSON.stringify(place),
            payment_method: paymentMethod,
            notes,
            selected_vehicle_id: userProfile?.selected_vehicle_id,
            user_id: userProfile?.id,
            location_name: locationName,
        };

        if (
            !Number(odometer) ||
            isNaN(Number(odometer)) ||
            Number(odometer) <= 0 ||
            !pricePerLiter.trim() ||
            isNaN(Number(pricePerLiter)) ||
            Number(pricePerLiter) <= 0 ||
            !totalCost.trim() ||
            isNaN(Number(totalCost)) ||
            Number(totalCost) <= 0 ||
            !litres.trim() ||
            isNaN(Number(litres)) ||
            Number(litres) <= 0 ||
            !fuelType.trim() ||
            !place === undefined ||
            !paymentMethod.trim() ||
            !userProfile?.selected_vehicle_id ||
            !userProfile?.id
        ) {
            Alert.alert(
                "Validation Error",
                "Please fill in all fields correctly before submitting."
            );
            return;
        }

        mutate(addFuelExpense, {
            onSuccess: () => {
                // Step 1: Update vehicle after fuel expense is added
                updateVehicle(
                    {
                        vehicle: {
                            ...selectedVehicle,
                            // @ts-ignore
                            current_mileage:
                                odometer !== ""
                                    ? Number(odometer)
                                    : selectedVehicle?.current_mileage,
                        },
                        // @ts-ignore
                        vehicleId: selectedVehicle?.id,
                        // @ts-ignore
                        userId: userProfile?.id,
                    },
                    {
                        onSuccess: () => {
                            console.log("✅ Vehicle updated successfully!");
                        },
                        onError: (error) => {
                            console.warn("🚨 Error updating vehicle:", error);
                            return;
                        },
                    }
                );

                // ✅ Step 2: Show success alert
                Alert.alert("Success", "Fuel Expense added successfully!", [
                    {
                        text: "OK",
                        onPress: () => console.log("Alert closed"),
                    },
                ]);

                // ✅ Step 3: Reset all form values
                setOdometer("");
                setFuelType("");
                setPricePerLiter("");
                setTotalCost("");
                setLitres("");
                setIsEnabled(false);
                setPlace(undefined);
                setPaymentMethod("");
                setNotes("");

                // ✅ Step 4: Navigate back (optional)
                navigation.goBack();
            },

            onError: (err: any) => {
                console.warn("❌ Error inserting Fuel Expense:", err.message);
            },
        });
    };

    function saveLocationHandler() {
        navigation.navigate(
            "MapScreen",

            {
                setPlace,
                setLocationName,
            }
        );
    }

    const onAttachFile = async () => {
        const uploadResult = await handleAttachFileAndUpload();

        if (uploadResult.success && uploadResult.file) {
            console.log("✅ File picked:", uploadResult.file.name);

            setAttachment({
                uri: uploadResult.file.uri,
                name: uploadResult.file.name,
                mimeType:
                    uploadResult.file.mimeType || "application/octet-stream",
            });
        } else {
            // @ts-ignore
            console.log("❌ Error picking file:", uploadResult.error);
        }
    };

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View style={styles.container}>
                <View style={styles.innerKeyboardContainer}>
                    {/* Date & Time Inputs */}
                    <View style={styles.dateTimeContainer}>
                        <Pressable
                            onPress={() => setModalVisible(true)}
                            style={({ pressed }) =>
                                pressed
                                    ? styles.PressedDateTimeInputContainer
                                    : styles.dateTimeInputContainer
                            }
                        >
                            <Ionicons
                                name="calendar"
                                size={20}
                                color="#6c6b6b"
                                style={styles.icon}
                            />
                            <Text style={styles.dateTimeText}>
                                {selectedDate?.toString() || "dd/mm/yyyy"}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setModalVisible(true)}
                            style={({ pressed }) =>
                                pressed
                                    ? styles.PressedDateTimeInputContainer
                                    : styles.dateTimeInputContainer
                            }
                        >
                            <Ionicons
                                name="calendar"
                                size={20}
                                color="#6c6b6b"
                                style={styles.icon}
                            />
                            <Text style={styles.dateTimeText}>
                                {selectedTime?.toString() || "00:00"}
                            </Text>
                        </Pressable>
                    </View>

                    <DateTimePickerModal
                        modalVisible={modalVisible}
                        setModalVisible={setModalVisible}
                        selectedDateTime={selectedDateTime}
                        setSelectedDateTime={setSelectedDateTime}
                        setSelectedDate={setSelectedDate}
                        setSelectedTime={setSelectedTime}
                    />

                    {/* Odometer Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons
                            name="speedometer"
                            size={24}
                            color="#6c6b6b"
                            style={styles.icon}
                        />

                        <View style={styles.innerInputContainer}>
                            <TextInput
                                ref={odometerRef}
                                placeholder="Odometer (km)"
                                value={odometer}
                                onChangeText={setOdometer}
                                keyboardType="numeric"
                                onSubmitEditing={() =>
                                    // @ts-ignore
                                    serviceTypeRef.current?.focus()
                                }
                                style={styles.input}
                                clearButtonMode={"always"}
                            />
                        </View>
                    </View>

                    {/* Last Odometer */}
                    <View style={styles.hintContainer}>
                        <Text style={styles.hint}>
                            Last odometer:{" "}
                            {selectedVehicle?.current_mileage || "N/A"} km
                        </Text>
                    </View>

                    {/* Fuel Type Input */}
                    <View style={styles.inputContainer}>
                        <FontAwesome5
                            name="gas-pump"
                            size={24}
                            color="#6c6b6b"
                            style={styles.icon}
                        />
                        <View style={styles.innerInputContainer}>
                            <TextInput
                                ref={fuelTypeRef}
                                placeholder="Fuel type"
                                value={fuelType}
                                onChangeText={setFuelType}
                                keyboardType="default"
                                onSubmitEditing={() =>
                                    // @ts-ignore
                                    fuelTypeRef.current?.focus()
                                }
                                style={styles.input}
                                clearButtonMode={"always"}
                                placeholderTextColor="#888"
                            />
                        </View>
                    </View>

                    {/* Fuel Inputs */}
                    <View style={styles.fuelInputsContainer}>
                        <FontAwesome5
                            name="money-bill-wave"
                            size={22}
                            color="#6c6b6b"
                            style={styles.icon}
                        />
                        <TextInput
                            ref={pricePerLiterRef}
                            placeholder="Price/L"
                            value={pricePerLiter}
                            onChangeText={setPricePerLiter}
                            keyboardType="numeric"
                            onSubmitEditing={() =>
                                // @ts-ignore
                                pricePerLiterRef.current?.focus()
                            }
                            style={styles.fuelInputs}
                            clearButtonMode={"always"}
                            placeholderTextColor="#888"
                        />
                        <TextInput
                            ref={totalCostRef}
                            placeholder="Total cost"
                            value={totalCost}
                            onChangeText={setTotalCost}
                            keyboardType="numeric"
                            onSubmitEditing={() =>
                                // @ts-ignore
                                totalCostRef.current?.focus()
                            }
                            style={styles.fuelInputs}
                            clearButtonMode={"always"}
                            placeholderTextColor="#888"
                        />
                        <TextInput
                            ref={litresRef}
                            placeholder="Litres"
                            value={litres}
                            onChangeText={setLitres}
                            keyboardType="numeric"
                            onSubmitEditing={() =>
                                // @ts-ignore
                                litresRef.current?.focus()
                            }
                            style={styles.fuelInputs}
                            clearButtonMode={"always"}
                            placeholderTextColor="#888"
                        />
                    </View>

                    {/* Filling switch Input */}
                    <View style={styles.inputContainer}>
                        <FontAwesome5
                            name="fill"
                            size={24}
                            color="#6c6b6b"
                            style={styles.icon}
                        />

                        <View
                            style={[
                                styles.innerInputContainer,
                                { borderBottomColor: "white" },
                            ]}
                        >
                            <Text style={styles.textSwitch}>
                                Are you filling the tank?
                            </Text>

                            <Switch
                                trackColor={{
                                    false: "#767577",
                                    true: "#81b0ff",
                                }}
                                thumbColor={isEnabled ? "#f4f3f4" : "#f4f3f4"}
                                ios_backgroundColor="#3e3e3e"
                                onValueChange={toggleSwitch}
                                value={isEnabled}
                            />
                        </View>
                    </View>

                    {/* Gas station Input */}
                    <View style={styles.inputContainer}>
                        <FontAwesome5
                            name="gas-pump"
                            size={24}
                            color="#6c6b6b"
                            style={styles.icon}
                        />

                        <View style={styles.innerInputContainer}>
                            <TextInput
                                ref={placeRef}
                                placeholder="Gas Station"
                                value={locationName}
                                onPress={saveLocationHandler}
                                keyboardType="default"
                                onSubmitEditing={() =>
                                    // @ts-ignore
                                    placeRef.current?.focus()
                                }
                                style={styles.input}
                                clearButtonMode={"always"}
                                placeholderTextColor="#888"
                            />
                        </View>
                    </View>

                    {/* Payment method Input */}
                    <View style={styles.inputContainer}>
                        <MaterialIcons
                            name="payments"
                            size={24}
                            color="#6c6b6b"
                            style={styles.icon}
                        />
                        <View style={styles.innerInputContainer}>
                            <TextInput
                                ref={paymentMethodRef}
                                placeholder="Payment method"
                                value={paymentMethod}
                                onChangeText={setPaymentMethod}
                                keyboardType="default"
                                onSubmitEditing={() =>
                                    // @ts-ignore
                                    paymentMethodRef.current?.focus()
                                }
                                style={styles.input}
                                clearButtonMode={"always"}
                                editable={false}
                                placeholderTextColor="#888"
                            />
                        </View>
                    </View>

                    {/* Attatch File input */}
                    <View style={styles.inputContainer}>
                        <MaterialIcons
                            name="attach-file"
                            size={24}
                            color="#6c6b6b"
                            style={styles.icon}
                        />
                        <View
                            style={[
                                styles.innerInputContainer,
                                { borderBottomWidth: 0 },
                            ]}
                        >
                            <Pressable
                                style={styles.attachFile}
                                onPress={onAttachFile}
                            >
                                <Text style={styles.attachText}>
                                    Attach file
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {attachment && (
                        <Text
                            style={{
                                marginLeft: 10,
                                color: "black",
                                fontSize: 14,
                            }}
                        >
                            Selected file: {attachment.name}
                        </Text>
                    )}

                    {/* Note Input */}
                    <View style={styles.inputContainerNoteContainer}>
                        <MaterialIcons
                            name="notes"
                            size={24}
                            color="#6c6b6b"
                            style={styles.icon}
                        />
                        <View style={styles.innerInputContainer}>
                            <TextInput
                                ref={notesRef}
                                placeholder="Notes"
                                value={notes}
                                onChangeText={setNotes}
                                returnKeyType="done"
                                style={[styles.input, styles.notesInput]}
                                multiline
                                clearButtonMode={"always"}
                                placeholderTextColor="#888"
                            />
                        </View>
                    </View>

                    {/* Save Button */}
                    <Pressable
                        style={({ pressed }) =>
                            pressed ? styles.pressableButton : styles.saveButton
                        }
                        onPress={addFuelExpenseHandler}
                    >
                        <Text style={styles.saveButtonText}>SAVE</Text>
                    </Pressable>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingBottom: 150,
    },
    dateTimeContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        paddingHorizontal: 6,
    },
    dateTimeInputContainer: {
        flexDirection: "row",
        width: "48%",
        height: 48,
        backgroundColor: "white",
        alignItems: "center",
        padding: 10,
        marginVertical: 5,
        borderRadius: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#DDD",
        marginBottom: 12,
    },
    iconContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    innerInputContainer: {
        flexDirection: "row",
        flexGrow: 1,
        borderBottomWidth: 1,
        borderBottomColor: "#DDD",
        justifyContent: "space-between",
        alignItems: "center",
        // paddingLeft: 12,
        marginLeft: 16,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        marginVertical: 5,
        borderRadius: 8,
        marginBottom: 12,
    },

    fuelInputsContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 10,
        marginVertical: 5,
        borderRadius: 8,
        marginBottom: 12,
        gap: 10, // Ensures equal spacing between inputs
    },
    fuelInputs: {
        flex: 1, // Equal width distribution
        height: 48, // Set explicit height
        borderBottomWidth: 1,
        borderBottomColor: "#DDD",
        fontSize: 16,
        paddingHorizontal: 10,
        textAlign: "center", // Aligns text properly inside inputs
    },
    icon: {
        marginRight: 10,
    },
    input: {
        fontSize: 16,
        color: "black",
        width: 300,
        height: 48, // Set explicit height
    },
    hintContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-end",
        flexDirection: "row",
    },
    hint: {
        fontSize: 12,
        color: "gray",
        marginLeft: 10,
        marginBottom: 5,
        marginRight: 12,
    },
    textSwitch: {
        fontSize: 14,
        color: "#454343",
    },
    attachFile: {
        marginVertical: 10,
    },
    attachText: {
        color: "#4942CD",
        fontSize: 16,
        fontWeight: "bold",
    },
    notesInput: {
        height: 80,
        width: 300,
        textAlignVertical: "top",
        borderRadius: 8,
    },
    saveButton: {
        marginTop: 24,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        // height: 48,
        backgroundColor: "#4942CD",
        borderRadius: 12,
    },
    saveButtonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },
    innerKeyboardContainer: {
        padding: 16,
    },
    dateTimeText: {
        width: "100%",
        flex: 1,
        fontSize: 16,
        color: "black",
    },
    PressedDateTimeInputContainer: {
        flexDirection: "row",
        width: "48%",
        height: 48,
        backgroundColor: "#e0e0e0",
        alignItems: "center",
        padding: 10,
        marginVertical: 5,
        borderRadius: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#DDD",
        marginBottom: 12,
    },
    pressableButton: {
        marginTop: 24,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        borderRadius: 12,
        backgroundColor: "#625be7",
    },
    inputContainerNoteContainer: {
        flexDirection: "row",
        padding: 10,
        marginVertical: 5,
        borderRadius: 8,
        marginBottom: 12,
    },
});
