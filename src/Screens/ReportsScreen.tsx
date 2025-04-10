import React, { useContext, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    SafeAreaView,
    Platform,
    Pressable,
} from "react-native";
import { ProfileContext } from "../providers/ProfileDataProvider";
import { Fuel_Expenses } from "../../types/fuel_expenses";
import { DateTimePickerModal } from "./DateTimePickerModal";
import { DateType } from "react-native-ui-datepicker";
import { Ionicons } from "@expo/vector-icons";
import {parseMMDDYYYY} from "../utils/parseMMDDYYYY";

const ReportsScreen = () => {
    const { userProfile, expenses, fuelExpenses } = useContext(ProfileContext);

    let fuelTotalCost = 0;
    let serviceTotalCost = 0;
    let insuranceCost = 0;

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

    const [selectedDateTime, setSelectedDateTime] = useState<DateType>();
    const [modalVisible, setModalVisible] = useState(false);

    function filterByDateRange(
        data: Fuel_Expenses[],
        startDate: DateType,
        endDate: DateType
    ): Fuel_Expenses[] {
        // @ts-ignore
        const start = parseMMDDYYYY(startDate);
        // @ts-ignore
        const end = parseMMDDYYYY(endDate);

        return data.filter((entry) => {
            // @ts-ignore
            const entryDate = new Date(entry.date);
            return entryDate >= start && entryDate <= end;
        });
    }

    const filtered = filterByDateRange(
        fuelExpenses ? fuelExpenses : [],
        selectedDate,
        selectedDueDate
    );

    if (expenses) {
        // const fuelExpensesCost = expenses[0].fuel_expenses
        expenses.forEach((element) => {
            if (element.fuel_expenses) {
                fuelTotalCost = element.fuel_expenses.reduce(
                    // @ts-ignore
                    (accumulator, currentValue) =>
                        accumulator + Number(currentValue.total_cost),
                    0
                );
            }

            if (element.service_expenses) {
                serviceTotalCost = element.service_expenses.reduce(
                    // @ts-ignore
                    (accumulator, currentValue) =>
                        accumulator + Number(currentValue.cost),
                    0
                );
            }

            if (element.insurance_expenses) {
                insuranceCost = element.insurance_expenses.reduce(
                    // @ts-ignore
                    (accumulator, currentValue) =>
                        accumulator + Number(currentValue.cost),
                    0
                );
            }
        });
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                <SafeAreaView style={styles.container}>
                    <View style={styles.innerKeyboardContainer}>
                        {/* Tabs */}
                        <ScrollView style={styles.content}>
                            {/* <Text style={styles.dateRange}>
                                2 entries (16/01/2025 - 16/01/2025)
                            </Text> */}

                            {/* Date & Time Inputs */}
                            <View style={styles.dateTimeWrapper}>
                                {/* First Date-Time Picker */}
                                <View style={styles.dateTimeContainer}>
                                    <Text style={styles.label}>Start Date</Text>
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
                                            {selectedDate?.toString() ||
                                                "dd/mm/yyyy"}
                                        </Text>
                                    </Pressable>
                                </View>

                                {/* Second Date-Time Picker */}
                                <View style={styles.dateTimeContainer}>
                                    <Text style={styles.label}>End Date</Text>
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
                                            name="calendar"
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
                                isValidUntilButtonPressed={
                                    isValidUntilButtonPressed
                                }
                                selectedDate={selectedDate}
                                selectedDueDate={selectedDueDate}
                            />

                            {/* Balance Section */}
                            <View style={styles.sections}>
                                <Text style={styles.sectionTitle}>Balance</Text>

                                <View style={styles.innerSection}>
                                    <View style={styles.column}>
                                        <Text style={styles.redText}>
                                            Total price
                                        </Text>
                                        <Text
                                            style={[
                                                styles.columnRightWithBorder,
                                            ]}
                                        >
                                            {fuelTotalCost.toFixed(2)} €
                                        </Text>
                                    </View>

                                    <View style={styles.column}>
                                        <Text>By day</Text>
                                        <Text
                                            style={[
                                                styles.columnRightWithBorder,
                                            ]}
                                        >
                                            {serviceTotalCost.toFixed(2)} €
                                        </Text>
                                    </View>
                                    <View style={styles.column}>
                                        <Text>By km</Text>
                                        <Text
                                            style={[
                                                styles.columnRightWithBorder,
                                            ]}
                                        >
                                            {insuranceCost.toFixed(2)} €
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Cost Section */}
                            <View style={styles.sections}>
                                <Text style={styles.sectionTitle}>Cost</Text>

                                <View style={styles.innerSection}>
                                    <View style={styles.column}>
                                        <Text style={styles.redText}>
                                            Total
                                        </Text>
                                        <Text
                                            style={[
                                                styles.columnRightWithBorder,
                                            ]}
                                        >
                                            67,65 €
                                        </Text>
                                    </View>

                                    <View style={styles.column}>
                                        <Text>By day</Text>
                                        <Text
                                            style={[
                                                styles.columnRightWithBorder,
                                            ]}
                                        >
                                            -12,00 €
                                        </Text>
                                    </View>
                                    <View style={styles.column}>
                                        <Text>By km</Text>
                                        <Text>0,00 €</Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    innerKeyboardContainer: {
        padding: 16,
    },
    container: {
        flex: 1,
        backgroundColor: "#F8F8F8",
    },
    topBar: {
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#00AFCF",
        padding: 10,
    },
    time: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    icons: {
        flexDirection: "column",
        alignItems: "center",
    },
    batteryText: {
        color: "white",
        marginLeft: 4,
    },
    header: {
        alignItems: "center",
        padding: 10,
        backgroundColor: "#00AFCF",
    },
    headerText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },
    tabs: {
        flexDirection: "column",
        justifyContent: "space-around",
        backgroundColor: "#E8E8E8",
        paddingVertical: 10,
    },
    tab: {
        paddingVertical: 5,
    },
    tabText: {
        color: "gray",
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: "#00AFCF",
    },
    activeTabText: {
        color: "#00AFCF",
    },
    content: {
        padding: 15,
    },
    dateRange: {
        textAlign: "center",
        color: "gray",
        marginBottom: 10,
    },
    sections: {
        backgroundColor: "white",
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 5,
        color: "#00AFCF",
    },
    column: {
        flex: 1,
        height: 54,
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 4,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#c4c0c0",
    },
    redText: {
        color: "red",
    },
    greenText: {
        color: "green",
    },
    innerSection: {
        marginTop: 8,
        flexDirection: "row",
        flexGrow: 1,
    },
    columnRightWithBorder: {
        borderRightWidth: 1,
        borderRightColor: "#c4c0c0",
        paddingHorizontal: 24,
    },

    /// date picker

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
    icon: {
        marginRight: 10,
    },
    dateTimeText: {
        fontSize: 16,
        color: "#555",
        marginLeft: 8,
    },
});

export default ReportsScreen;
