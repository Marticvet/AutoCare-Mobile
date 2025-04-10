import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { useContext, useMemo, useState } from "react";
import { ProfileContext } from "../providers/ProfileDataProvider";
import { BarChart } from "react-native-chart-kit";
import { DateType } from "react-native-ui-datepicker";
import { Fuel_Expenses } from "../../types/fuel_expenses";
import { parseMMDDYYYY } from "../utils/parseMMDDYYYY";
import { Ionicons } from "@expo/vector-icons";
import { DateTimePickerModal } from "./DateTimePickerModal";

// Get screen width
const screenWidth = Dimensions.get("window").width;

// Chart configuration (styling)
const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 2, // Show values with 2 decimal places
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue bars
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // Black labels
    barPercentage: 0.6, // Increase bar width
    fillShadowGradient: "#2196F3", // Blue bar color
    fillShadowGradientOpacity: 1,
};

export const FuelExpensesScreen = () => {
    const { fuelExpenses } = useContext(ProfileContext);
    const [selectedFuelType, setSelectedFuelType] = useState(null);

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

    // If data is loading
    if (!fuelExpenses) {
        return (
            <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ fontSize: 16, color: "#555" }}>
                    Loading fuel expenses...
                </Text>
            </View>
        );
    }

    // If no data
    if (fuelExpenses.length === 0) {
        return (
            <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ fontSize: 16, color: "#555" }}>
                    No fuel expenses recorded yet.
                </Text>
            </View>
        );
    }

    // Filtered fuel expenses based on selected fuel type
    const filteredFuelExpenses = filterByDateRange(
        fuelExpenses ? fuelExpenses : [],
        selectedDate,
        selectedDueDate
    );

    // Format dates for X-Axis
    const formattedLabels = filteredFuelExpenses.map((expense) =>
        expense.date
            ? new Date(expense.date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
              })
            : "Unknown"
    );

    // Get total cost data
    const totalCosts = filteredFuelExpenses.map(
        (expense) => expense.total_cost || 0
    );

    // Memoized chart data
    const chartData = useMemo(
        () => ({
            labels: formattedLabels,
            datasets: [{ data: totalCosts }],
        }),
        [filteredFuelExpenses]
    );

    return (
        <View
            style={{
                padding: 20,
                backgroundColor: "#FFF",
                borderRadius: 20,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 3 },
                shadowRadius: 10,
                elevation: 5,
            }}
        >
            {/* Title */}
            <Text
                style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    textAlign: "center",
                    color: "#333",
                }}
            >
                Fuel Expenses Overview
            </Text>

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
                            {selectedDate?.toString() || "dd/mm/yyyy"}
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
                            {selectedDueDate?.toString() || "dd/mm/yyyy"}
                        </Text>
                    </Pressable>
                </View>

                <DateTimePickerModal
                    modalVisible={modalVisible}
                    setModalVisible={setModalVisible}
                    selectedDateTime={selectedDateTime}
                    setSelectedDateTime={setSelectedDateTime}
                    setSelectedDate={setSelectedDate}
                    insuranceExpenseScreen={true}
                    setSelectedDueDate={setSelectedDueDate}
                    setIsValidUntilButtonPressed={setIsValidUntilButtonPressed}
                    isValidUntilButtonPressed={isValidUntilButtonPressed}
                    selectedDate={selectedDate}
                    selectedDueDate={selectedDueDate}
                />
            </View>

            {/* Bar Chart */}
            <BarChart
                data={chartData}
                width={screenWidth - 40}
                height={250}
                yAxisLabel="€"
                chartConfig={chartConfig}
                showBarTops={true}
                verticalLabelRotation={30} // Rotate labels to prevent overlap
                style={{
                    borderRadius: 16,
                    marginVertical: 10,
                    elevation: 3, // Slight shadow effect
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
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
