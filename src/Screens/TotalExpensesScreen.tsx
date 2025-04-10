import React from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    SafeAreaView,
    Platform,
} from "react-native";

const TotalExpensesScreen = () => {
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
                            <Text style={styles.dateRange}>
                                2 entries (16/01/2025 - 16/01/2025)
                            </Text>

                            {/* Balance Section */}
                            <View style={styles.sections}>
                                <Text style={styles.sectionTitle}>Balance</Text>

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
                                            55,65 €
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
                                        <Text>-0,27 €</Text>
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
                                            {/* 67,65 € */}
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
});

export default TotalExpensesScreen;
