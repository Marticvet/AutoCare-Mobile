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
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    SafeAreaView,
    Pressable,
    TextInput,
    Switch,
    Alert,
} from "react-native";
import { DateType } from "react-native-ui-datepicker";
import { DateTimePickerModal } from "./DateTimePickerModal";
import { ProfileContext } from "../providers/ProfileDataProvider";
import { Insurance_Expenses } from "../../types/insurance_expenses";
import { useNavigation } from "@react-navigation/native";
import { useInsertInsuranceExpense } from "../api/insurance_expenses";

export const InsuranceExpenseScreen = () => {
    const navigation = useNavigation();
    // Retrieve the values provided by ProfileDataProvider
    const { selectedVehicle, userProfile } = useContext(ProfileContext);
    const { mutate, isPending, error } = useInsertInsuranceExpense(); // ✅ Call Hook at the top level

    const [selectedDateTime, setSelectedDateTime] = useState<DateType>();
    const [modalVisible, setModalVisible] = useState(false);

    const [odometer, setOdometer] = useState("");
    const [cost, setCost] = useState("");
    const [notes, setNotes] = useState("");

    // References for each input field to manage focus
    const odometerRef = useRef(null);
    const costRef = useRef(null);
    const notesRef = useRef(null);

    const date = new Date(); // Get current date & time
    const userLocale = Intl.DateTimeFormat().resolvedOptions().locale; // Auto-detect user locale

    // Format Date (User's Locale)
    const formattedDate = date.toLocaleDateString(userLocale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    const [isValidUntilButtonPressed, setIsValidUntilButtonPressed] =
        useState(false);
    const [selectedDate, setSelectedDate] = useState<DateType>(formattedDate);
    const [selectedDueDate, setSelectedDueDate] =
        useState<DateType>(formattedDate);

    function submitSaveHandler() {
        const addInsuranceExpense: Insurance_Expenses = {
            odometer: Number(odometer),
            cost: Number(cost),
            notes,
            valid_from: date,
            valid_to: date,
            selected_vehicle_id: userProfile?.selected_vehicle_id,
            user_id: userProfile?.id,
        };

        // valid_from &&
        // valid_to &&
        if (
            !odometer.trim() ||
            isNaN(Number(odometer)) ||
            Number(odometer) <= 0 ||
            !cost.trim() ||
            isNaN(Number(cost)) ||
            Number(cost) <= 0 ||
            !userProfile?.selected_vehicle_id ||
            !userProfile?.id
        ) {
            // Submit data to Supabase
        } else {
            Alert.alert(
                "Validation Error",
                "Please fill in all fields correctly before submitting."
            );
            return;
        }

        // @ts-ignore
        mutate(addInsuranceExpense, {
            onSuccess: () => {
                Alert.alert(
                    "Success",
                    "Insurance Expense added successfully!",
                    [{ text: "OK", onPress: () => console.log("Alert closed") }]
                );

                // ✅ OPTIONAL: Auto-close the alert after 1.5 seconds
                setTimeout(() => {
                    console.log("Closing alert...");
                }, 1500);

                // ✅ Reset All State Values
                setOdometer("");
                setCost("");
                setNotes("");

                // ✅ Navigate back if needed
                navigation.goBack();
            },
            // @ts-ignore
            onError: (err) => {
                console.error(
                    "Error inserting Insurance Expense:",
                    err.message
                );
            },
        });
    }

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View style={styles.container}>
                <View style={styles.innerKeyboardContainer}>
                    {/* Date & Time Inputs */}
                    <View style={styles.dateTimeWrapper}>
                        {/* First Date-Time Picker */}
                        <View style={styles.dateTimeContainer}>
                            <Text style={styles.label}>Valid from</Text>
                            <Pressable
                                onPress={() => {
                                    setModalVisible(true);
                                    setIsValidUntilButtonPressed(false);
                                }}
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
                        </View>

                        {/* Second Date-Time Picker */}
                        <View style={styles.dateTimeContainer}>
                            <Text style={styles.label}>Valid until</Text>
                            <Pressable
                                onPress={() => {
                                    setModalVisible(true);
                                    setIsValidUntilButtonPressed(true);
                                }}
                                style={({ pressed }) =>
                                    pressed
                                        ? styles.PressedDateTimeInputContainer
                                        : styles.dateTimeInputContainer
                                }
                            >
                                <Ionicons
                                    name="time"
                                    size={20}
                                    color="#6c6b6b"
                                    style={styles.icon}
                                />
                                <Text style={styles.dateTimeText}>
                                    {selectedDueDate?.toString() ||
                                        "dd/mm/yyyy"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    <DateTimePickerModal
                        modalVisible={modalVisible}
                        setModalVisible={setModalVisible}
                        selectedDateTime={selectedDateTime}
                        setSelectedDateTime={setSelectedDateTime}
                        setSelectedDate={setSelectedDate}
                        insuranceExpenseScreen={true}
                        setSelectedDueDate={setSelectedDueDate}
                        setIsValidUntilButtonPressed={
                            setIsValidUntilButtonPressed
                        }
                        isValidUntilButtonPressed={isValidUntilButtonPressed}
                    />

                    {/* Current odometer Input */}
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
                                    odometerRef.current?.focus()
                                }
                                style={styles.input}
                                clearButtonMode={"always"}
                                placeholderTextColor="#888"
                            />
                        </View>
                    </View>

                    {/* Current odometer Input */}
                    <View style={styles.inputContainer}>
                        <FontAwesome5
                            name="money-bill-wave"
                            size={22}
                            color="#6c6b6b"
                            style={styles.icon}
                        />

                        <View style={styles.innerInputContainer}>
                            <TextInput
                                ref={costRef}
                                placeholder="Cost"
                                value={cost}
                                onChangeText={setCost}
                                keyboardType="numeric"
                                onSubmitEditing={() =>
                                    // @ts-ignore
                                    costRef.current?.focus()
                                }
                                style={styles.input}
                                clearButtonMode={"always"}
                                placeholderTextColor="#888"
                            />
                        </View>
                    </View>

                    {/* Attatch File input */}
                    {/* <View style={styles.inputContainer}>
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
                                <Pressable style={styles.attachFile}>
                                    <Text style={styles.attachText}>
                                        Attach file
                                    </Text>
                                </Pressable>
                            </View>
                        </View> */}

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
                        onPress={submitSaveHandler}
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
    dateTimeWrapper: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginVertical: 10,
        gap: 16, // Ensures spacing between elements
    },
    dateTimeContainer: {
        flex: 1, // Ensures both take equal space
    },
    label: {
        fontSize: 16,
        fontWeight: "500",
        color: "#333",
        marginBottom: 5, // Spacing between label and button
    },
    dateTimeInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderColor: "#DDD",
        width: "100%",
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
    inputContainerNoteContainer: {
        flexDirection: "row",
        padding: 10,
        marginVertical: 5,
        borderRadius: 8,
        marginBottom: 12,
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
        fontSize: 16,
        color: "#555",
        marginLeft: 8,
    },
    PressedDateTimeInputContainer: {
        flexDirection: "row",
        backgroundColor: "#e0e0e0",
        alignItems: "center",
        padding: 10,
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderColor: "#DDD",
        width: "100%",
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
});
