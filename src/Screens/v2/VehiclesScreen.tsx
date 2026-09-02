import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, FormField, LoadingState, PageHeader, Row, Screen } from "../../components/ui";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useGarage } from "../../providers/GarageProvider";
import { colors, spacing, typography } from "../../theme/tokens";
import { useSubscription } from "../../billing/SubscriptionProvider";

export default function VehiclesScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t, formatDistance } = usePreferences();
    const { vehicles, selectedVehicleId, loading } = useGarage();
    const { canAddVehicle, loading: subscriptionLoading } = useSubscription();
    const [search, setSearch] = useState("");
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return vehicles;
        return vehicles.filter((vehicle) => [vehicle.vehicle_brand, vehicle.vehicle_model, vehicle.vehicle_license_plate, vehicle.vehicle_identification_number].join(" ").toLowerCase().includes(query));
    }, [search, vehicles]);

    const addVehicle = () => {
        if (subscriptionLoading) {
            Alert.alert("AutoCare Plus", "Your subscription status is still loading. Please try again in a moment.");
            return;
        }
        if (!canAddVehicle(vehicles.length)) {
            navigation.navigate("Paywall", { source: "vehicle" });
            return;
        }
        navigation.navigate("VehicleForm");
    };

    if (loading) return <Screen><LoadingState /></Screen>;
    return (
        <Screen>
            <PageHeader title={t("vehicles")} action={t("addVehicle")} onAction={addVehicle} />
            {vehicles.length ? (
                <>
                    <FormField label={t("search")} value={search} onChangeText={setSearch} />
                    <Card style={styles.list}>
                        {filtered.map((vehicle, index) => (
                            <View key={vehicle.id ?? String(index)}>
                                <Row
                                    icon={vehicleTypeIcon(vehicle.vehicle_car_type)}
                                    tone="blue"
                                    title={`${vehicle.vehicle_brand ?? ""} ${vehicle.vehicle_model ?? ""}`.trim() || t("vehicle")}
                                    subtitle={`${vehicle.vehicle_license_plate || "—"} · ${vehicle.vehicle_model_year || "—"} · ${formatDistance(vehicle.current_mileage ?? 0)}`}
                                    trailing={
                                        <View style={styles.trailing}>
                                            {vehicle.id === selectedVehicleId ? (
                                                <View style={styles.selectedBadge}><Ionicons name="checkmark" size={14} color={colors.white} /></View>
                                            ) : null}
                                            <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
                                        </View>
                                    }
                                    onPress={() => navigation.navigate("VehicleDetail", { vehicleId: vehicle.id ?? "" })}
                                />
                                {index < filtered.length - 1 ? <View style={styles.divider} /> : null}
                            </View>
                        ))}
                        {!filtered.length ? <Text style={styles.noResult}>{t("none")}</Text> : null}
                    </Card>
                </>
            ) : (
                <EmptyState icon="car-sport-outline" title={t("noVehicles")} body={t("noVehiclesBody")} action={t("addVehicle")} onAction={addVehicle} />
            )}
        </Screen>
    );
}

const vehicleTypeIcon = (type: string | null) => ({
    motorcycle: "bicycle-outline",
    truck: "bus-outline",
    van: "car-sport-outline",
}[type ?? ""] ?? "car-outline");

const styles = StyleSheet.create({
    list: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
    noResult: { ...typography.body, color: colors.inkMuted, textAlign: "center", padding: spacing.xl },
    trailing: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    selectedBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.success },
});
