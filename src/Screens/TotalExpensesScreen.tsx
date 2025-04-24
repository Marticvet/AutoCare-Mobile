import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { ProfileContext } from "../providers/ProfileDataProvider";
import { Fuel_Expenses } from "../../types/fuel_expenses";
import { DateTimePickerModal } from "./DateTimePickerModal";
import { DateType } from "react-native-ui-datepicker";
import { Ionicons } from "@expo/vector-icons";
import { parseMMDDYYYY } from "../utils/parseMMDDYYYY";
import { PieChart } from "react-native-chart-kit";
import { Insurance_Expenses } from "../../types/insurance_expenses";
import { formattedDate } from "../../types/formatteddateTime";

// Get screen width
const screenWidth = Dimensions.get("window").width;

// Chart configuration (styling)
const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 2, // Show values with 2 decimal places
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue bars
    labelColor: (opacity = 1) => `rgba(177, 80, 80, ${opacity})`, // rgb(177, 80, 80) labels
    barPercentage: 0.6, // Increase bar width
    fillShadowGradient: "#2196F3", // Blue bar color
    fillShadowGradientOpacity: 1,
};

const pieColors = {
    fuel: "#2196F3", // Blue
    service: "#FF9800", // Orange
    insurance: "#E91E63", // Pink
    other: "#4CAF50", // Green
};

const normalizeToLocalDate = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const TotalExpensesScreen = () => {
    const { expenses } = useContext(ProfileContext);

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

    const [isValidUntilButtonPressed, setIsValidUntilButtonPressed] =
        useState(false);
    const [selectedDate, setSelectedDate] = useState<DateType>(formattedDate);
    const [selectedDueDate, setSelectedDueDate] =
        useState<DateType>(formattedDate);

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

    useEffect(() => {

        if (expenses) {
            setChartData([]);
            setTotalCost(0);
            SetMinTotalCost(0);
            setMaxTotalCost(0);
            setAvgTotalCost(0);
            setTotalDistance(0);
            setStartDistance(0);
            setEndDistance(0);

            // @ts-ignore
            const start = parseMMDDYYYY(selectedDate);
            
            // @ts-ignore
            const end = parseMMDDYYYY(selectedDueDate);

            let allCosts: number[] = [];

            expenses.forEach((element) => {
                // --- Fuel ---
                if (element.fuel_expenses) {
                    const filtered = element.fuel_expenses.filter(
                        (entry: Fuel_Expenses) => {
                            // @ts-ignore
                            const entryDate = new Date(entry.date);
                            return entryDate >= start && entryDate <= end;
                        }
                    );

                    const sorted = [...filtered].sort(
                        (a, b) => a.total_cost - b.total_cost
                    );
                    const sum = sorted.reduce(
                        (acc, cur) => acc + Number(cur.total_cost),
                        0
                    );

                    if (sum > 0) {
                        setTotalCost((old) => old + sum);
                        allCosts.push(
                            ...sorted.map((e) => Number(e.total_cost))
                        );

                        setChartData((prev) => [
                            ...prev,
                            {
                                name: "Fuel",
                                cost: sum,
                                color: pieColors.fuel,
                                legendFontColor: "#7F7F7F",
                                legendFontSize: 15,
                            },
                        ]);

                        const distSorted = [...sorted].sort(
                            (a, b) => b.odometer - a.odometer
                        );
                        const minOdo = Number(
                            distSorted[distSorted.length - 1].odometer
                        );
                        const maxOdo = Number(distSorted[0].odometer);
                        const dist = maxOdo - minOdo;

                        setStartDistance(minOdo);
                        setEndDistance(maxOdo);
                        setTotalDistance(dist);
                    }
                }

                // --- Service ---
                if (element.service_expenses) {
                    const filtered = element.service_expenses.filter(
                        (entry: any) => {
                            const entryDate = new Date(entry.date);
                            return entryDate >= start && entryDate <= end;
                        }
                    );

                    const sorted = [...filtered].sort(
                        (a, b) => a.cost - b.cost
                    );
                    const sum = sorted.reduce(
                        (acc, cur) => acc + Number(cur.cost),
                        0
                    );

                    if (sum > 0) {
                        setTotalCost((old) => old + sum);
                        allCosts.push(...sorted.map((e) => Number(e.cost)));

                        setChartData((prev) => [
                            ...prev,
                            {
                                name: "Service",
                                cost: sum,
                                color: pieColors.service,
                                legendFontColor: "#7F7F7F",
                                legendFontSize: 15,
                            },
                        ]);
                    }
                }

                // --- Insurance ---
                if (element.insurance_expenses) {
                    const filtered = element.insurance_expenses.filter(
                        (entry: Insurance_Expenses) => {
                            const entryDate = normalizeToLocalDate(
                                // @ts-ignore
                                new Date(entry.valid_from)
                            );
                            return entryDate >= start && entryDate <= end;
                        }
                    );

                    const sorted = [...filtered].sort(
                        (a, b) => a.cost - b.cost
                    );
                    const sum = sorted.reduce(
                        (acc, cur) => acc + Number(cur.cost),
                        0
                    );

                    if (sum > 0) {
                        setTotalCost((old) => old + sum);
                        allCosts.push(...sorted.map((e) => Number(e.cost)));

                        setChartData((prev) => [
                            ...prev,
                            {
                                name: "Insurance",
                                cost: sum,
                                color: pieColors.insurance,
                                legendFontColor: "#7F7F7F",
                                legendFontSize: 15,
                            },
                        ]);
                    }
                }
            });

            // Final calc after all expenses
            if (allCosts.length > 0) {
                const sorted = [...allCosts].sort((a, b) => a - b);
                SetMinTotalCost(sorted[0]);
                setMaxTotalCost(sorted[sorted.length - 1]);
                setAvgTotalCost(
                    sorted.reduce((acc, cur) => acc + cur, 0) / sorted.length
                );
            }
        } else {
            setMaxTotalCost(0);
            setAvgTotalCost(0);
            setTotalDistance(0);
            setStartDistance(0);
            setEndDistance(0);
        }
    }, [selectedDate, selectedDueDate, expenses]);

    return (
        <View style={styles.container}>
            {/* Title */}
            <Text
                style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    textAlign: "center",
                    color: "#333",
                }}
            >
                Total Expenses Overview
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
            </View>

            <View style={styles.chartContainer}>
                {chartdata.length > 0 ? (
                    <PieChart
                        data={chartdata}
                        width={screenWidth - 25}
                        height={260}
                        chartConfig={chartConfig}
                        accessor={"cost"}
                        backgroundColor={"transparent"}
                        paddingLeft={"0"}
                        center={[10, 0]}
                        absolute
                    />
                ) : (
                    <View style={styles.chartPlaceholder}>
                        <Ionicons
                            name="information-circle-outline"
                            size={40}
                            color="#aaa"
                        />
                        <Text style={styles.chartPlaceholderText}>
                            No expense data available for the selected range.
                        </Text>
                    </View>
                )}
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

            {chartdata.length > 0 && (
                <React.Fragment>
                    {/* Balance Section */}
                    <View style={styles.sections}>
                        <Text style={styles.sectionTitle}>Cost</Text>

                        <View style={styles.innerSection}>
                            <View style={styles.column}>
                                <Text>Min Cost</Text>
                                <Text style={[styles.columnRightWithBorder]}>
                                    {minTotalCost.toFixed(2)} €
                                </Text>
                            </View>
                            <View style={styles.column}>
                                <Text>Max Cost</Text>
                                <Text style={[styles.columnRightWithBorder]}>
                                    {maxTotalCost.toFixed(2)} €
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
                                <Text style={styles.redText}>
                                    Total Distance
                                </Text>
                                <Text>{totalDistance} km</Text>
                            </View>
                        </View>
                    </View>
                </React.Fragment>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
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
    greenText: {
        color: "green",
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

    // chart
    chartPlaceholder: {
        height: 260,
        width: "90%",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#fff",
        borderRadius: 10,
        marginHorizontal: 16,
        marginVertical: 16,
    },

    chartPlaceholderText: {
        marginTop: 12,
        fontSize: 16,
        color: "#777",
        textAlign: "center",
    },
    chartContainer: {
        width: "100%",
    },
    /////////
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

export default TotalExpensesScreen;
