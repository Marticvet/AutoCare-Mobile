import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Card, EmptyState, LoadingState, PageHeader, Row, Screen, SelectField } from "../../components/ui";
import { useTrips } from "../../data/liveQueries";
import { TripRecord } from "../../data/models";
import { fetchTripsFromServer } from "../../data/repository";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useGarage } from "../../providers/GarageProvider";
import { colors, spacing } from "../../theme/tokens";
import { toNumber } from "../../utils/tracking";

export default function TripsScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { vehicles, selectedVehicleId, dataOwnerId } = useGarage();
    const { formatDistance, formatCurrency, t } = usePreferences();
    const [vehicleId, setVehicleId] = useState(selectedVehicleId || "__all__");
    const filteredVehicleId = vehicleId === "__all__" ? "" : vehicleId;
    const { data: localTrips, loading: localLoading } = useTrips(dataOwnerId, filteredVehicleId);
    const serverScope = `${dataOwnerId}:${filteredVehicleId}`;
    const [serverResult, setServerResult] = useState<{
        scope: string;
        trips: TripRecord[];
        loading: boolean;
        error: boolean;
    }>({ scope: "", trips: [], loading: false, error: false });

    useFocusEffect(useCallback(() => {
        let mounted = true;
        if (!dataOwnerId || localLoading || localTrips.length) {
            return () => { mounted = false; };
        }

        setServerResult({ scope: serverScope, trips: [], loading: true, error: false });
        void fetchTripsFromServer(dataOwnerId, filteredVehicleId || undefined)
            .then((trips) => {
                if (mounted) setServerResult({ scope: serverScope, trips, loading: false, error: false });
            })
            .catch(() => {
                if (mounted) setServerResult({ scope: serverScope, trips: [], loading: false, error: true });
            });

        return () => { mounted = false; };
    }, [dataOwnerId, filteredVehicleId, localLoading, localTrips.length, serverScope]));

    const scopedServerTrips = serverResult.scope === serverScope ? serverResult.trips : [];
    const trips = useMemo(() => {
        const merged = new Map<string, TripRecord>();
        scopedServerTrips.forEach((trip) => trip.id && merged.set(trip.id, trip));
        localTrips.forEach((trip) => trip.id && merged.set(trip.id, trip));
        return [...merged.values()].sort((left, right) =>
            String(right.start_at ?? "").localeCompare(String(left.start_at ?? ""))
        );
    }, [localTrips, scopedServerTrips]);
    const waitingForServer = !localLoading
        && !localTrips.length
        && (serverResult.scope !== serverScope || serverResult.loading);
    const loading = localLoading || waitingForServer;
    const serverError = serverResult.scope === serverScope && serverResult.error;

    if (loading) return <Screen><LoadingState /></Screen>;
    return (
        <Screen>
            <PageHeader title={t("tripLog")} action={t("addTrip")} onAction={() => navigation.navigate("TripForm", { vehicleId: filteredVehicleId || undefined })} />
            <SelectField
                label={t("vehicle")}
                value={vehicleId}
                onChange={setVehicleId}
                placeholder={t("allVehicles")}
                options={[{ value: "__all__", label: t("allVehicles") }, ...vehicles.map((vehicle) => ({ value: vehicle.id ?? "", label: [vehicle.vehicle_brand, vehicle.vehicle_model, vehicle.vehicle_license_plate].filter(Boolean).join(" · ") }))]}
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
                                    title={trip.title || `${trip.origin || t("tripStart")} → ${trip.destination || t("destination")}`}
                                    subtitle={`${String(trip.start_at).slice(0, 10)} · ${formatDistance(toNumber(trip.distance_km))} · ${vehicle?.vehicle_license_plate || vehicle?.vehicle_model || t("vehicle")}${reimbursement ? ` · ${formatCurrency(reimbursement)} ${t("reimbursable").toLocaleLowerCase()}` : ""}`}
                                    tone={trip.purpose === "business" ? "green" : "blue"}
                                    onPress={() => trip.id && navigation.navigate("TripForm", { tripId: trip.id })}
                                />
                                {index < trips.length - 1 ? <View style={styles.divider} /> : null}
                            </View>
                        );
                    })}
                </Card>
            ) : <EmptyState
                icon="navigate-outline"
                title={serverError ? t("tripRefreshFailed") : t("noTripsLogged")}
                body={serverError
                    ? t("tripRefreshFailedBody")
                    : t("noTripsBody")}
                action={t("addTrip")}
                onAction={() => navigation.navigate("TripForm", { vehicleId: filteredVehicleId || undefined })}
            />}
        </Screen>
    );
}

const styles = StyleSheet.create({
    list: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
});
