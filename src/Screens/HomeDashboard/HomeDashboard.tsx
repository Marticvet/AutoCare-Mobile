import React from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ScrollView,
} from "react-native";

const HomeDashboard: React.FC = () => {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Home Dashboard</Text>

            {/* Vehicle Overview Section */}
            <View style={styles.vehicleOverview}>
                <Text style={styles.subtitle}>Vehicle Details</Text>
                <View style={styles.vehicleImageContainer}>
                    <Text style={styles.vehiclePlaceholder}>🚗</Text>
                </View>
                <View style={styles.statsContainer}>
                    <View style={styles.stat}>
                        <Text style={styles.statText}>Mileage</Text>
                        <Text style={styles.statValue}>26,000</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statText}>Fuel</Text>
                        <Text style={styles.statValue}>50%</Text>
                    </View>
                </View>
            </View>

            {/* Maintenance Section */}
            <View style={styles.maintenanceSection}>
                <Text style={styles.subtitle}>Upcoming Maintenance</Text>
                <View style={styles.maintenanceItem}>
                    <Text style={styles.maintenanceText}>Oil Change</Text>
                    <Text style={styles.maintenanceDate}>Due in 30 days</Text>
                </View>
                <View style={styles.maintenanceItem}>
                    <Text style={styles.maintenanceText}>Tire Rotation</Text>
                    <Text style={styles.maintenanceDate}>Due in 60 days</Text>
                </View>
            </View>

            {/* Add Vehicle Button */}
            <Pressable style={styles.addButton}>
                <Text style={styles.addButtonText}>Add Vehicle</Text>
            </Pressable>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: "#f0f2f5",
        alignItems: "center",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 20,
    },
    vehicleOverview: {
        width: "100%",
        backgroundColor: "#ffffff",
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    subtitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#666",
        marginBottom: 10,
    },
    vehicleImageContainer: {
        alignItems: "center",
        marginBottom: 20,
    },
    vehiclePlaceholder: {
        fontSize: 60,
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    stat: {
        alignItems: "center",
    },
    statText: {
        fontSize: 16,
        color: "#888",
    },
    statValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    maintenanceSection: {
        width: "100%",
        backgroundColor: "#ffffff",
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    maintenanceItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
    },
    maintenanceText: {
        fontSize: 18,
        color: "#333",
    },
    maintenanceDate: {
        fontSize: 16,
        color: "#888",
    },
    addButton: {
        backgroundColor: "#ff7a59",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        width: "100%",
    },
    addButtonText: {
        fontSize: 18,
        color: "#fff",
        fontWeight: "600",
    },
});

export default HomeDashboard;
