import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Card, EmptyState, PageHeader, Row, Screen, SelectField } from "../../components/ui";
import { useTrips } from "../../data/liveQueries";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useGarage } from "../../providers/GarageProvider";
import { colors, spacing } from "../../theme/tokens";
import { toNumber } from "../../utils/tracking";

export default function TripsScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { vehicles, selectedVehicleId, dataOwnerId } = useGarage();
    const { formatDistance, formatCurrency } = usePreferences();
    const [vehicleId, setVehicleId] = useState(selectedVehicleId || "__all__");
    const filteredVehicleId = vehicleId === "__all__" ? "" : vehicleId;
    const { data: trips } = useTrips(dataOwnerId, filteredVehicleId);
    return (
        <Screen>
            <PageHeader title="Trip log" action="Add trip" onAction={() => navigation.navigate("TripForm", { vehicleId: filteredVehicleId || undefined })} />
            <SelectField
                label="Vehicle"
                value={vehicleId}
                onChange={setVehicleId}
                placeholder="All vehicles"
                options={[{ value: "__all__", label: "All vehicles" }, ...vehicles.map((vehicle) => ({ value: vehicle.id ?? "", label: [vehicle.vehicle_brand, vehicle.vehicle_model, vehicle.vehicle_license_plate].filter(Boolean).join(" · ") }))]}
            />
            {trips.length ? (
                <Card style={styles.list}>
                    {trips.map((trip, index) => {
                        const vehicle = vehicles.find((entry) => entry.id === trip.vehicle_id);
                        const reimbursement = toNumber(trip.distance_km) * toNumber(trip.reimbursable_rate);
                        return (
                            <View key={trip.id ?? index}>
                                <Row
                                    icon={trip.purpose === "business" ? "briefcase-outline" : "navigate-outline"}
                                    title={trip.title || `${trip.origin || "Start"} → ${trip.destination || "Destination"}`}
                                    subtitle={`${String(trip.start_at).slice(0, 10)} · ${formatDistance(toNumber(trip.distance_km))} · ${vehicle?.vehicle_license_plate || vehicle?.vehicle_model || "Vehicle"}${reimbursement ? ` · ${formatCurrency(reimbursement)} reimbursable` : ""}`}
                                    tone={trip.purpose === "business" ? "green" : "blue"}
                                    onPress={() => trip.id && navigation.navigate("TripForm", { tripId: trip.id })}
                                />
                                {index < trips.length - 1 ? <View style={styles.divider} /> : null}
                            </View>
                        );
                    })}
                </Card>
            ) : <EmptyState icon="navigate-outline" title="No trips logged" body="Start with manual business and personal trips. Automatic GPS or Bluetooth tracking can be added later without changing this history." action="Add trip" onAction={() => navigation.navigate("TripForm", { vehicleId: filteredVehicleId || undefined })} />}
        </Screen>
    );
}

const styles = StyleSheet.create({
    list: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
});
