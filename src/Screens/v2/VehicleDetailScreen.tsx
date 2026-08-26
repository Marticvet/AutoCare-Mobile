import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Card, LoadingState, MetricCard, Row, Screen, SectionHeader } from "../../components/ui";
import { useDocuments, useExpenses, useReminders, useVehicle } from "../../data/liveQueries";
import { deleteVehicle } from "../../data/repository";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useAuth } from "../../providers/AuthProvider";
import { useConnectivity } from "../../providers/ConnectivityProvider";
import { useGarage } from "../../providers/GarageProvider";
import { deleteStoredDocument } from "../../services/documentStorage";
import { colors, spacing, typography } from "../../theme/tokens";
import { getReminderState, totalExpenses } from "../../utils/tracking";

type Props = NativeStackScreenProps<RootStackParamList, "VehicleDetail">;

export default function VehicleDetailScreen({ route, navigation }: Props) {
    const { vehicleId } = route.params;
    const { userId } = useAuth();
    const { isOnline } = useConnectivity();
    const { t, formatCurrency, formatDistance } = usePreferences();
    const { selectedVehicleId, selectVehicle } = useGarage();
    const { data: vehicle, loading } = useVehicle(userId, vehicleId);
    const { data: expenses } = useExpenses(userId, vehicleId);
    const { data: reminders } = useReminders(userId, vehicleId);
    const { data: documents } = useDocuments(userId, vehicleId);
    const due = useMemo(() => reminders.filter((reminder) => getReminderState(reminder, vehicle?.current_mileage ?? 0) !== "completed"), [reminders, vehicle]);

    const confirmDelete = () => {
        Alert.alert(t("deleteVehicleTitle"), t("deleteVehicleBody"), [
            { text: t("cancel"), style: "cancel" },
            {
                text: t("delete"),
                style: "destructive",
                onPress: () => void (async () => {
                    try {
                        const storedDocuments = await deleteVehicle(userId, vehicleId);
                        await Promise.allSettled(storedDocuments.map((document) => deleteStoredDocument(document, isOnline)));
                        navigation.popToTop();
                    } catch (error) {
                        Alert.alert(t("delete"), (error as Error).message);
                    }
                })(),
            },
        ]);
    };

    if (loading || !vehicle) return <Screen><LoadingState /></Screen>;
    return (
        <Screen>
            <Card style={styles.hero}>
                <View style={styles.heroTop}>
                    <View style={styles.vehicleIcon}><Text style={styles.vehicleEmoji}>🚙</Text></View>
                    <View style={styles.heroText}>
                        <Text style={styles.name}>{vehicle.vehicle_brand} {vehicle.vehicle_model}</Text>
                        <Text style={styles.meta}>{vehicle.vehicle_license_plate || "—"} · {vehicle.vehicle_model_year || "—"}</Text>
                    </View>
                </View>
                <View style={styles.actions}>
                    {selectedVehicleId !== vehicleId ? <Button label={t("selectedVehicle")} compact variant="secondary" onPress={() => void selectVehicle(vehicleId)} /> : null}
                    <Button label={t("edit")} icon="create-outline" compact variant="ghost" onPress={() => navigation.navigate("VehicleForm", { vehicleId })} />
                </View>
            </Card>

            <View style={styles.metrics}>
                <MetricCard label={t("mileage")} value={formatDistance(vehicle.current_mileage ?? 0)} icon="speedometer-outline" />
                <MetricCard label={t("totalSpend")} value={formatCurrency(totalExpenses(expenses))} icon="wallet-outline" tone="green" />
                <MetricCard label={t("upcoming")} value={String(due.length)} icon="notifications-outline" tone={due.length ? "amber" : "green"} />
                <MetricCard label={t("documents")} value={String(documents.length)} icon="documents-outline" />
            </View>

            <View style={styles.section}>
                <SectionHeader title={t("quickActions")} />
                <Card style={styles.list}>
                    <Row icon="receipt-outline" title={t("addExpense")} onPress={() => navigation.navigate("ExpenseForm", { category: "service", vehicleId })} />
                    <View style={styles.divider} />
                    <Row icon="notifications-outline" title={t("addReminder")} onPress={() => navigation.navigate("ReminderForm", { vehicleId })} />
                    <View style={styles.divider} />
                    <Row icon="document-attach-outline" title={t("addDocument")} onPress={() => navigation.navigate("DocumentForm", { vehicleId })} />
                </Card>
            </View>

            <View style={styles.section}>
                <SectionHeader title={t("vehicleDetails")} />
                <Card style={styles.details}>
                    <Detail label={t("vehicleType")} value={vehicle.vehicle_car_type} />
                    <Detail label={t("vin")} value={vehicle.vehicle_identification_number} />
                    <Detail label={t("manufactureYear")} value={String(vehicle.vehicle_year_of_manufacture ?? "—")} />
                </Card>
            </View>
            <Button label={t("delete")} icon="trash-outline" variant="danger" onPress={confirmDelete} />
        </Screen>
    );
}

function Detail({ label, value }: { label: string; value: string | null }) {
    return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value || "—"}</Text></View>;
}

const styles = StyleSheet.create({
    hero: { gap: spacing.lg },
    heroTop: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
    vehicleIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
    vehicleEmoji: { fontSize: 34 },
    heroText: { flex: 1, gap: 3 },
    name: { ...typography.title, color: colors.ink },
    meta: { ...typography.body, color: colors.inkMuted },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, flexWrap: "wrap" },
    metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    section: { gap: spacing.md },
    list: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
    details: { gap: spacing.md },
    detail: { flexDirection: "row", justifyContent: "space-between", gap: spacing.lg },
    detailLabel: { ...typography.body, color: colors.inkMuted },
    detailValue: { ...typography.bodyStrong, color: colors.ink, flex: 1, textAlign: "right" },
});
