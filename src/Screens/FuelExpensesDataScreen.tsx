import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Fuel_Expenses } from "../../types/fuel_expenses";
import { LinearGradientExpenses } from "./LinearGradientExpenses";

interface FuelExpensesDataProps {
    fuelEntries: Fuel_Expenses[] | undefined;
}

export function FuelExpensesDataScreen({ fuelEntries }: FuelExpensesDataProps) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (!fuelEntries) return;

    // Convert to Date objects
    fuelEntries.forEach((e: any) => {
        e.date = new Date(e.date);
    });

    // Fill-ups
    const totalFillUps = fuelEntries.length;
    const fillUpsThisYear = fuelEntries.filter(
        // @ts-ignore
        (e) => e.date.getFullYear() === currentYear
    ).length;
    const fillUpsLastYear = fuelEntries.filter(
        // @ts-ignore
        (e) => e.date.getFullYear() === currentYear - 1
    ).length;
    const fillUpsThisMonth = fuelEntries.filter(
        (e) =>
            // @ts-ignore
            e.date.getFullYear() === currentYear &&
            // @ts-ignore
            e.date.getMonth() === currentMonth
    ).length;
    const fillUpsLastMonth = fuelEntries.filter(
        (e) =>
            // @ts-ignore
            e.date.getFullYear() === currentYear &&
            // @ts-ignore
            e.date.getMonth() === currentMonth - 1
    ).length;

    // Fuel volume
    const litresList = fuelEntries.map((e) => e.total_litres);
    // @ts-ignore
    const totalLitres = litresList.reduce((a, b) => a + b, 0);
    const litresThisYear = fuelEntries
        // @ts-ignore
        .filter((e) => e.date.getFullYear() === currentYear)
        // @ts-ignore
        .reduce((a, b) => a + b.total_litres, 0);
    const litresThisMonth = fuelEntries
        .filter(
            (e) =>
                // @ts-ignore
                e.date.getFullYear() === currentYear &&
                // @ts-ignore
                e.date.getMonth() === currentMonth
        )
        // @ts-ignore
        .reduce((a, b) => a + b.total_litres, 0);
    const litresLastYear = fuelEntries
        // @ts-ignore
        .filter((e) => e.date.getFullYear() === currentYear - 1)
        // @ts-ignore
        .reduce((a, b) => a + b.total_litres, 0);
    const litresLastMonth = fuelEntries
        .filter(
            (e) =>
                // @ts-ignore

                e.date.getFullYear() === currentYear &&
                // @ts-ignore

                e.date.getMonth() === currentMonth - 1
        )
        // @ts-ignore

        .reduce((a, b) => a + b.total_litres, 0);
    // @ts-ignore

    const minFillUp = Math.min(...litresList);
    // @ts-ignore

    const maxFillUp = Math.max(...litresList);

    // Average consumption
    // @ts-ignore

    function calculateConsumption(entries: FuelEntry[]) {
        const fulls = entries
            .filter((e) => e.full_tank)
            .sort(
                (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
            );

        if (fulls.length < 2) return 0;

        let totalDistance = 0;
        let totalFuel = 0;

        for (let i = 1; i < fulls.length; i++) {
            const distance = fulls[i].odometer - fulls[i - 1].odometer;
            const segmentFuel = entries
                .filter(
                    (e) =>
                        new Date(e.date) > new Date(fulls[i - 1].date) &&
                        new Date(e.date) <= new Date(fulls[i].date)
                )
                .reduce((a, b) => a + b.total_litres, 0);

            totalDistance += distance;
            totalFuel += segmentFuel;
        }

        return totalDistance > 0
            ? +((totalFuel / totalDistance) * 100).toFixed(2)
            : 0;
    }

    const avgConsumption = calculateConsumption(fuelEntries);

    // Pass calculated data into UI
    const stats = {
        totalFillUps,
        fillUpsThisYear,
        fillUpsLastYear,
        fillUpsThisMonth,
        fillUpsLastMonth,
        // @ts-ignore
        totalLitres: +totalLitres.toFixed(2),
        litresThisYear: +litresThisYear.toFixed(2),
        litresThisMonth: +litresThisMonth.toFixed(2),
        litresLastYear: +litresLastYear.toFixed(2),
        litresLastMonth: +litresLastMonth.toFixed(2),
        minFillUp: +minFillUp.toFixed(2),
        maxFillUp: +maxFillUp.toFixed(2),
        averageFuelConsumption: avgConsumption,
    };

    return <FuelStatsScreen stats={stats} />;
}

const FuelStatsScreen = ({ stats }: any) => {
    return (
        <ScrollView style={styles.container}>
            <LinearGradientExpenses>
                <Text style={styles.cardTitle}>Fill-ups</Text>
                <Text style={styles.cardValue}>{stats.totalFillUps}</Text>
                <View style={styles.row}>
                    <Text style={styles.rowText}>
                        This year: {stats.fillUpsThisYear}
                    </Text>
                    <Text style={styles.rowText}>
                        This month: {stats.fillUpsThisMonth}
                    </Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.rowText}>
                        Previous year: {stats.fillUpsLastYear}
                    </Text>
                    <Text style={styles.rowText}>
                        Previous month: {stats.fillUpsLastMonth}
                    </Text>
                </View>
            </LinearGradientExpenses>

            <LinearGradientExpenses>
                <Text style={styles.cardTitle}>Fuel</Text>
                <Text style={styles.cardValue}>{stats.totalLitres} L</Text>
                <View style={styles.row}>
                    <Text style={styles.rowText}>
                        This year: {stats.litresThisYear} L
                    </Text>
                    <Text style={styles.rowText}>
                        This month: {stats.litresThisMonth} L
                    </Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.rowText}>
                        Previous year: {stats.litresLastYear} L
                    </Text>
                    <Text style={styles.rowText}>
                        Previous month: {stats.litresLastMonth} L
                    </Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.rowText}>
                        Min fill-up: {stats.minFillUp} L
                    </Text>
                    <Text style={styles.rowText}>
                        Max fill-up: {stats.maxFillUp} L
                    </Text>
                </View>
            </LinearGradientExpenses>

            <LinearGradientExpenses>
                <Text style={styles.cardTitle}>Average fuel consumption</Text>
                <Text style={styles.cardValue}>
                    {stats.averageFuelConsumption} L/100km
                </Text>
                <View style={styles.row}>
                    <Text style={styles.rowText}>Best fuel consumption: -</Text>
                    <Text style={styles.rowText}>
                        Worst fuel consumption: -
                    </Text>
                </View>
            </LinearGradientExpenses>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: "#1467c6",
        // padding: 16,
    },
    card: {
        backgroundColor: "#1467c6",
        borderRadius: 10,
        padding: 16,
        // marginBottom: 16,
        marginVertical: 16,
    },
    cardTitle: {
        // color: "#aaa",
        // fontSize: 16,
        // marginBottom: 4,
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 5,
        color: "#00AFCF",
    },
    cardValue: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 12,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    rowText: {
        // color: "#ccc",
        fontSize: 16,
        color: "#d7d5d5",
        fontWeight: 500,
    },
});

export default FuelExpensesDataScreen;
