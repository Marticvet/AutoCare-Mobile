import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Card, DateField, EmptyState, FormField, LoadingState, Screen, SectionHeader, SelectField, TimeField } from "../../components/ui";
import { VehicleSelectField } from "../../components/VehicleSelectField";
import { useTrips } from "../../data/liveQueries";
import { TripDraft, TripRecord } from "../../data/models";
import { deleteTrip, fetchTripFromServer, saveTrip } from "../../data/repository";
import { RootStackParamList } from "../../navigation/types";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { useGarage } from "../../providers/GarageProvider";
import { spacing } from "../../theme/tokens";
import { isoDate, isoTime, toNumber } from "../../utils/tracking";

type Props = NativeStackScreenProps<RootStackParamList, "TripForm">;

export default function TripFormScreen({ route, navigation }: Props) {
    const { t } = usePreferences();
    const tripId = route.params?.tripId;
    const { vehicles, selectedVehicleId, dataOwnerId, canWrite } = useGarage();
    const { data: trips, loading } = useTrips(dataOwnerId);
    const localSource = trips.find((trip) => trip.id === tripId);
    const serverScope = `${dataOwnerId}:${tripId ?? ""}`;
    const [serverResult, setServerResult] = useState<{
        scope: string;
        trip: TripRecord | null;
        loading: boolean;
        error: boolean;
    }>({ scope: "", trip: null, loading: false, error: false });
    const [hydratedTripId, setHydratedTripId] = useState<string | null>(null);
    const [draft, setDraft] = useState<TripDraft>({
        id: tripId,
        userId: dataOwnerId,
        vehicleId: route.params?.vehicleId || selectedVehicleId,
        purpose: "personal",
        title: "",
        startDate: isoDate(),
        startTime: isoTime(),
        endDate: isoDate(),
        endTime: isoTime(),
        startOdometer: "",
        endOdometer: "",
        distanceKm: "",
        origin: "",
        destination: "",
        reimbursableRate: "",
        notes: "",
    });
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (tripId || !vehicles.length) return;
        if (vehicles.some((vehicle) => vehicle.id === draft.vehicleId)) return;

        const nextVehicleId = vehicles.some((vehicle) => vehicle.id === selectedVehicleId)
            ? selectedVehicleId
            : vehicles[0]?.id ?? "";
        setDraft((current) => ({ ...current, vehicleId: nextVehicleId }));
    }, [draft.vehicleId, selectedVehicleId, tripId, vehicles]);

    useEffect(() => {
        let mounted = true;
        if (!tripId || !dataOwnerId || loading || localSource?.id) {
            return () => { mounted = false; };
        }

        setServerResult({ scope: serverScope, trip: null, loading: true, error: false });
        void fetchTripFromServer(tripId, dataOwnerId)
            .then((trip) => {
                if (mounted) setServerResult({ scope: serverScope, trip, loading: false, error: false });
            })
            .catch(() => {
                if (mounted) setServerResult({ scope: serverScope, trip: null, loading: false, error: true });
            });

        return () => { mounted = false; };
    }, [dataOwnerId, loading, localSource?.id, serverScope, tripId]);

    const scopedServerResult = serverResult.scope === serverScope ? serverResult : null;
    const source = localSource ?? scopedServerResult?.trip;

    useEffect(() => {
        if (!source || !tripId || hydratedTripId === tripId) return;
        const start = new Date(source.start_at ?? new Date());
        const end = source.end_at ? new Date(source.end_at) : start;
        setDraft({
            id: source.id ?? undefined,
            userId: dataOwnerId,
            vehicleId: source.vehicle_id ?? "",
            purpose: (source.purpose as TripDraft["purpose"]) || "personal",
            title: source.title ?? "",
            startDate: isoDate(start),
            startTime: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
            endDate: isoDate(end),
            endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
            startOdometer: String(source.start_odometer ?? ""),
            endOdometer: String(source.end_odometer ?? ""),
            distanceKm: String(source.distance_km ?? ""),
            origin: source.origin ?? "",
            destination: source.destination ?? "",
            reimbursableRate: String(source.reimbursable_rate ?? ""),
            notes: source.notes ?? "",
        });
        setHydratedTripId(tripId);
    }, [dataOwnerId, hydratedTripId, source, tripId]);

    const update = <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
    const submit = async () => {
        const start = new Date(`${draft.startDate}T${draft.startTime}:00`);
        const end = new Date(`${draft.endDate}T${draft.endTime}:00`);
        const calculated = toNumber(draft.endOdometer) - toNumber(draft.startOdometer);
        if (!canWrite || !draft.vehicleId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start || (toNumber(draft.distanceKm) <= 0 && calculated <= 0)) {
            Alert.alert(tripId ? t("editTrip") : t("addTrip"), t("tripValidation"));
            return;
        }
        setBusy(true);
        try {
            await saveTrip(draft);
            Alert.alert(tripId ? t("tripUpdated") : t("tripSaved"));
            navigation.goBack();
        } catch (error) {
            Alert.alert(t("tripLog"), (error as Error).message);
        } finally {
            setBusy(false);
        }
    };
    const remove = () => tripId && Alert.alert(t("deleteTripQuestion"), undefined, [
        { text: t("cancel"), style: "cancel" },
        { text: t("delete"), style: "destructive", onPress: () => void deleteTrip(tripId, dataOwnerId).then(() => navigation.goBack()) },
    ]);

    const sourceLoading = Boolean(tripId) && (
        loading
        || (!localSource && (!scopedServerResult || scopedServerResult.loading))
        || (Boolean(source) && hydratedTripId !== tripId)
    );
    if (sourceLoading) return <Screen><LoadingState /></Screen>;
    if (tripId && !source) {
        return (
            <Screen>
                <EmptyState
                    icon="navigate-outline"
                    title={t("tripUnavailable")}
                    body={scopedServerResult?.error
                        ? t("tripUnavailableBody")
                        : t("tripUnavailableBody")}
                    action={t("backToTrips")}
                    onAction={navigation.goBack}
                />
            </Screen>
        );
    }

    return (
        <Screen>
            <SectionHeader title={tripId ? t("editTrip") : t("addTrip")} />
            <Card style={styles.form}>
                <VehicleSelectField vehicles={vehicles} value={draft.vehicleId} onChange={(value) => update("vehicleId", value)} />
                <SelectField label={t("tripPurpose")} value={draft.purpose} onChange={(value) => update("purpose", value)} options={[
                    { value: "personal", label: t("personal") }, { value: "business", label: t("business") }, { value: "commute", label: t("commute") }, { value: "other", label: t("other") },
                ]} />
                <FormField label={t("tripTitle")} value={draft.title} onChangeText={(value) => update("title", value)} />
                <View style={styles.columns}><View style={styles.column}><DateField label={t("startDate")} value={draft.startDate} onChange={(value) => update("startDate", value)} required /></View><View style={styles.column}><TimeField label={t("startTime")} value={draft.startTime} onChange={(value) => update("startTime", value)} required /></View></View>
                <View style={styles.columns}><View style={styles.column}><DateField label={t("endDate")} value={draft.endDate} onChange={(value) => update("endDate", value)} required /></View><View style={styles.column}><TimeField label={t("endTime")} value={draft.endTime} onChange={(value) => update("endTime", value)} required /></View></View>
                <View style={styles.columns}><View style={styles.column}><FormField label={t("startOdometerKm")} value={draft.startOdometer} onChangeText={(value) => update("startOdometer", value)} keyboardType="decimal-pad" /></View><View style={styles.column}><FormField label={t("endOdometerKm")} value={draft.endOdometer} onChangeText={(value) => update("endOdometer", value)} keyboardType="decimal-pad" /></View></View>
                <FormField label={t("distanceKm")} value={draft.distanceKm} onChangeText={(value) => update("distanceKm", value)} keyboardType="decimal-pad" hint={t("distanceOdometerHint")} />
                <FormField label={t("origin")} value={draft.origin} onChangeText={(value) => update("origin", value)} />
                <FormField label={t("destination")} value={draft.destination} onChangeText={(value) => update("destination", value)} />
                {draft.purpose === "business" ? <FormField label={t("reimbursementRate")} value={draft.reimbursableRate} onChangeText={(value) => update("reimbursableRate", value)} keyboardType="decimal-pad" /> : null}
                <FormField label={t("notes")} value={draft.notes} onChangeText={(value) => update("notes", value)} multiline />
            </Card>
            <Button label={t("saveTrip")} icon="checkmark" onPress={() => void submit()} loading={busy} />
            {tripId ? <Button label={t("deleteTrip")} icon="trash-outline" variant="danger" onPress={remove} /> : null}
        </Screen>
    );
}

const styles = StyleSheet.create({
    form: { gap: spacing.lg },
    columns: { flexDirection: "row", gap: spacing.md },
    column: { flex: 1 },
});
