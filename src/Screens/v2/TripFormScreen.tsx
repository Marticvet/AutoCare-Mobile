import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Card, DateField, FormField, Screen, SectionHeader, SelectField, TimeField } from "../../components/ui";
import { VehicleSelectField } from "../../components/VehicleSelectField";
import { useTrips } from "../../data/liveQueries";
import { TripDraft } from "../../data/models";
import { deleteTrip, saveTrip } from "../../data/repository";
import { RootStackParamList } from "../../navigation/types";
import { useGarage } from "../../providers/GarageProvider";
import { spacing } from "../../theme/tokens";
import { isoDate, isoTime, toNumber } from "../../utils/tracking";

type Props = NativeStackScreenProps<RootStackParamList, "TripForm">;

export default function TripFormScreen({ route, navigation }: Props) {
    const tripId = route.params?.tripId;
    const { vehicles, selectedVehicleId, dataOwnerId, canWrite } = useGarage();
    const { data: trips } = useTrips(dataOwnerId);
    const source = trips.find((trip) => trip.id === tripId);
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
        if (!source) return;
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
    }, [dataOwnerId, source]);

    const update = <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
    const submit = async () => {
        const start = new Date(`${draft.startDate}T${draft.startTime}:00`);
        const end = new Date(`${draft.endDate}T${draft.endTime}:00`);
        const calculated = toNumber(draft.endOdometer) - toNumber(draft.startOdometer);
        if (!canWrite || !draft.vehicleId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start || (toNumber(draft.distanceKm) <= 0 && calculated <= 0)) {
            Alert.alert(tripId ? "Edit trip" : "Add trip", "Choose a vehicle, valid times, and a positive distance or odometer range.");
            return;
        }
        setBusy(true);
        try {
            await saveTrip(draft);
            navigation.goBack();
        } catch (error) {
            Alert.alert("Trip", (error as Error).message);
        } finally {
            setBusy(false);
        }
    };
    const remove = () => tripId && Alert.alert("Delete trip?", undefined, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void deleteTrip(tripId, dataOwnerId).then(() => navigation.goBack()) },
    ]);

    return (
        <Screen>
            <SectionHeader title={tripId ? "Edit trip" : "Add trip"} />
            <Card style={styles.form}>
                <VehicleSelectField vehicles={vehicles} value={draft.vehicleId} onChange={(value) => update("vehicleId", value)} />
                <SelectField label="Purpose" value={draft.purpose} onChange={(value) => update("purpose", value)} options={[
                    { value: "personal", label: "Personal" }, { value: "business", label: "Business" }, { value: "commute", label: "Commute" }, { value: "other", label: "Other" },
                ]} />
                <FormField label="Trip title" value={draft.title} onChangeText={(value) => update("title", value)} />
                <View style={styles.columns}><View style={styles.column}><DateField label="Start date" value={draft.startDate} onChange={(value) => update("startDate", value)} required /></View><View style={styles.column}><TimeField label="Start time" value={draft.startTime} onChange={(value) => update("startTime", value)} required /></View></View>
                <View style={styles.columns}><View style={styles.column}><DateField label="End date" value={draft.endDate} onChange={(value) => update("endDate", value)} required /></View><View style={styles.column}><TimeField label="End time" value={draft.endTime} onChange={(value) => update("endTime", value)} required /></View></View>
                <View style={styles.columns}><View style={styles.column}><FormField label="Start odometer (km)" value={draft.startOdometer} onChangeText={(value) => update("startOdometer", value)} keyboardType="decimal-pad" /></View><View style={styles.column}><FormField label="End odometer (km)" value={draft.endOdometer} onChangeText={(value) => update("endOdometer", value)} keyboardType="decimal-pad" /></View></View>
                <FormField label="Distance (km)" value={draft.distanceKm} onChangeText={(value) => update("distanceKm", value)} keyboardType="decimal-pad" hint="Optional when both odometer values are supplied." />
                <FormField label="Origin" value={draft.origin} onChangeText={(value) => update("origin", value)} />
                <FormField label="Destination" value={draft.destination} onChangeText={(value) => update("destination", value)} />
                {draft.purpose === "business" ? <FormField label="Reimbursement rate per km" value={draft.reimbursableRate} onChangeText={(value) => update("reimbursableRate", value)} keyboardType="decimal-pad" /> : null}
                <FormField label="Notes" value={draft.notes} onChangeText={(value) => update("notes", value)} multiline />
            </Card>
            <Button label="Save trip" icon="checkmark" onPress={() => void submit()} loading={busy} />
            {tripId ? <Button label="Delete trip" icon="trash-outline" variant="danger" onPress={remove} /> : null}
        </Screen>
    );
}

const styles = StyleSheet.create({
    form: { gap: spacing.lg },
    columns: { flexDirection: "row", gap: spacing.md },
    column: { flex: 1 },
});
