import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { useContext, useEffect, useMemo, useState } from "react";
import { ProfileContext } from "../providers/ProfileDataProvider";
import { DateType } from "react-native-ui-datepicker";
import { parseMMDDYYYY } from "../utils/parseMMDDYYYY";
import { Ionicons } from "@expo/vector-icons";
import { DateTimePickerModal } from "./DateTimePickerModal";
import { BarChart } from "react-native-chart-kit";
import { Insurance_Expenses } from "../../types/insurance_expenses";

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

export const InsuranceExpensesScreen = () => {
    const { insuranceExpenses } = useContext(ProfileContext);

    // Get a date object for the current time
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setDate(1); // Prevent day overflow
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Optional: set back the day to what it was, if valid
    const lastDayOfPrevMonth = new Date(
        oneMonthAgo.getFullYear(),
        oneMonthAgo.getMonth() + 1,
        0
    ).getDate();
    oneMonthAgo.setDate(Math.min(now.getDate(), lastDayOfPrevMonth));

    const dueDate = new Date();
    const userLocale = Intl.DateTimeFormat().resolvedOptions().locale; // Auto-detect user locale
    // Get a date object for the current time

    oneMonthAgo.setDate(1); // Prevent day overflow
    oneMonthAgo.setMonth(now.getMonth() - 1);

    oneMonthAgo.setDate(Math.min(now.getDate(), lastDayOfPrevMonth));

    // Format Date (User's Locale)
    const formattedDate = oneMonthAgo.toLocaleDateString(userLocale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    // Format Date (User's Locale)
    const formattedDueDate = dueDate.toLocaleDateString(userLocale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    const [isValidUntilButtonPressed, setIsValidUntilButtonPressed] =
        useState(false);
    const [selectedDate, setSelectedDate] = useState<DateType>(formattedDate);
    const [selectedDueDate, setSelectedDueDate] =
        useState<DateType>(formattedDueDate);

    const [selectedDateTime, setSelectedDateTime] = useState<DateType>();
    const [modalVisible, setModalVisible] = useState(false);

    const [chartdata, setChartData] = useState<any[]>([]);

    const [totalCost, setTotalCost] = useState<number>(0);
    const [minTotalCost, SetMinTotalCost] = useState<number>(0);
    const [maxTotalCost, setMaxTotalCost] = useState<number>(0);
    const [avgTotalCost, setAvgTotalCost] = useState<number>(0);
    const [totalDistance, setTotalDistance] = useState<number>(0);
    const [startDistance, setStartDistance] = useState<number>(0);
    const [endDistance, setEndDistance] = useState<number>(0);

    const [filteredInsuranceExpenses, setFilteredInsuranceExpenses] = useState<
        Insurance_Expenses[]
    >([]);

    useEffect(() => {
        if (insuranceExpenses) {
            setChartData([]);
            setFilteredInsuranceExpenses([]);
            setTotalCost(0);

            // @ts-ignore
            const start = parseMMDDYYYY(selectedDate);
            // @ts-ignore
            const end = parseMMDDYYYY(selectedDueDate);

            const filteredInsuranceExpenses = insuranceExpenses.filter(
                (entry: Insurance_Expenses) => {
                    // @ts-ignore
                    const entryDate = new Date(entry.valid_from);
                    // @ts-ignore
                    const endDate = new Date(entry.valid_to);
                    if (entryDate >= start && endDate <= end) {
                        return entry;
                    }
                }
            );

            const insuranceTotalCost = filteredInsuranceExpenses.map(
                (entry: Insurance_Expenses) => {
                    return { date: entry.valid_from, cost: entry.cost };
                }
            );

            setFilteredInsuranceExpenses(insuranceTotalCost);
            setTotalCost(
                insuranceTotalCost.reduce(
                    // @ts-ignore
                    (accumulator, currentValue) =>
                        accumulator + Number(currentValue.cost),
                    0
                )
            );

            const sortedInsuranceExpensesTotalCost =
                filteredInsuranceExpenses.sort(
                    // @ts-ignore
                    (a, b) => a.cost - b.cost
                );

            if (sortedInsuranceExpensesTotalCost.length > 0) {
                SetMinTotalCost(
                    // @ts-ignore
                    sortedInsuranceExpensesTotalCost[
                        sortedInsuranceExpensesTotalCost.length - 1
                    ].cost
                );
                setMaxTotalCost(
                    // @ts-ignore
                    sortedInsuranceExpensesTotalCost[0].cost
                );
                setAvgTotalCost((minTotalCost + maxTotalCost) / 2);

                const sortedDistanceSum = insuranceExpenses.sort(
                    // @ts-ignore
                    (a, b) => b.odometer - a.odometer
                );
                const minDistance = Number(
                    sortedDistanceSum[sortedDistanceSum.length - 1].odometer
                );
                const maxDistance = Number(sortedDistanceSum[0].odometer);
                const totalDistanceSum = maxDistance - minDistance;

                // setAvgDistance
                setTotalDistance(totalDistanceSum);
                setStartDistance(minDistance);
                setEndDistance(maxDistance);
            } else {
                setMaxTotalCost(0);
                setAvgTotalCost(0);
                setTotalDistance(0);
                setStartDistance(0);
                setEndDistance(0);
            }
        }
    }, [selectedDate, selectedDueDate]);

    // Memoized chart data
    const chartData = useMemo(
        () => ({
            labels: filteredInsuranceExpenses.map(
                (entry) =>
                    // @ts-ignore
                    new Date(entry.date).toLocaleDateString("en-GB") // or use your locale
            ),
            datasets: [
                {
                    data: filteredInsuranceExpenses.map((entry) =>
                        Number(entry.cost || 0)
                    ),
                },
            ],
        }),
        [filteredInsuranceExpenses]
    );

    return (
        <View style={styles.expensesContainer}>
            {/* Title */}
            <Text
                style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    textAlign: "center",
                    color: "#333",
                }}
            >
                Insurance Expenses Overview
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
                height={300}
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

            {/* Balance Section */}
            <View style={styles.sections}>
                <Text style={styles.sectionTitle}>Cost</Text>

                <View style={styles.innerSection}>
                    <View style={styles.column}>
                        <Text>Min Cost</Text>
                        <Text style={[styles.columnRightWithBorder]}>
                            {maxTotalCost.toFixed(2)} €
                        </Text>
                    </View>
                    <View style={styles.column}>
                        <Text>Max Cost</Text>
                        <Text style={[styles.columnRightWithBorder]}>
                            {minTotalCost.toFixed(2)} €
                        </Text>
                    </View>
                    <View style={styles.column}>
                        <Text>Avg. Cost</Text>
                        <Text style={[styles.columnRightWithBorder]}>
                            {avgTotalCost.toFixed(2)} €
                        </Text>
                    </View>
                    <View style={styles.column}>
                        <Text style={styles.redText}>Total price</Text>
                        <Text>{totalCost.toFixed(2)} €</Text>
                    </View>
                </View>
            </View>

            {/* Distance Section */}
            <View style={styles.sections}>
                <Text style={styles.sectionTitle}>Distance</Text>

                <View style={styles.innerSection}>
                    <View style={styles.column}>
                        <Text>Start Distance</Text>
                        <Text style={[styles.columnRightWithBorder]}>
                            {startDistance} km
                        </Text>
                    </View>
                    <View style={styles.column}>
                        <Text>End Distance</Text>
                        <Text style={[styles.columnRightWithBorder]}>
                            {endDistance} km
                        </Text>
                    </View>
                    <View style={styles.column}>
                        <Text style={styles.redText}>Total Distance</Text>
                        <Text>{totalDistance} km</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    expensesContainer: {
        padding: 20,
        backgroundColor: "#FFF",
        borderRadius: 20,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 10,
        elevation: 5,
        flex: 1,
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
    ////////
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
    innerSection: {
        marginTop: 8,
        flexDirection: "row",
        flexGrow: 1,
    },
    columnRightWithBorder: {
        borderRightWidth: 1,
        borderRightColor: "#c4c0c0",
        // paddingHorizontal: 24,
        paddingRight: 12,
    },
    redText: {
        color: "red",
    },
});
