import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Card, LoadingState, MetricCard, Row, Screen, SectionHeader } from "../../components/ui";
import { useSubscription } from "../../billing/SubscriptionProvider";
import { useDocuments, useExpenses, useReminders, useTrips, useVehicle } from "../../data/liveQueries";
import { deleteVehicle } from "../../data/repository";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useConnectivity } from "../../providers/ConnectivityProvider";
import { useGarage } from "../../providers/GarageProvider";
import { deleteStoredDocument } from "../../services/documentStorage";
import { colors, spacing, typography } from "../../theme/tokens";
import { getReminderState, totalExpenses } from "../../utils/tracking";

type Props = NativeStackScreenProps<RootStackParamList, "VehicleDetail">;

export default function VehicleDetailScreen({ route, navigation }: Props) {
    const { vehicleId } = route.params;
    const { isOnline } = useConnectivity();
    const { t, formatCurrency, formatDistance } = usePreferences();
    const { selectedVehicleId, selectVehicle, dataOwnerId, canWrite } = useGarage();
    const { canCreateDocument } = useSubscription();
    const { data: vehicle, loading } = useVehicle(dataOwnerId, vehicleId);
    const { data: expenses } = useExpenses(dataOwnerId, vehicleId);
    const { data: reminders } = useReminders(dataOwnerId, vehicleId);
    const { data: documents } = useDocuments(dataOwnerId, vehicleId);
    const { data: trips } = useTrips(dataOwnerId, vehicleId);
    const due = useMemo(() => reminders.filter((reminder) => getReminderState(reminder, vehicle?.current_mileage ?? 0) !== "completed"), [reminders, vehicle]);
    const history = useMemo(() => [
        ...expenses.map((entry) => ({ id: `expense-${entry.source}-${entry.id}`, date: entry.date, icon: entry.category === "charging" ? "flash-outline" : "receipt-outline", title: entry.title, subtitle: `${formatCurrency(entry.amount)} · ${entry.category}`, tone: "blue" as const })),
        ...trips.map((entry) => ({ id: `trip-${entry.id}`, date: String(entry.start_at).slice(0, 10), icon: "navigate-outline", title: entry.title || `${entry.origin || "Start"} → ${entry.destination || "Destination"}`, subtitle: `${formatDistance(Number(entry.distance_km ?? 0))} · ${entry.purpose}`, tone: "green" as const })),
        ...reminders.map((entry) => ({ id: `reminder-${entry.id}`, date: entry.completed_at?.slice(0, 10) || entry.due_date || entry.created_at?.slice(0, 10) || "", icon: entry.status === "completed" ? "checkmark-circle-outline" : "notifications-outline", title: entry.title || t("reminder"), subtitle: entry.status === "completed" ? t("completed") : `${t("dueDate")} ${entry.due_date || "—"}`, tone: entry.status === "completed" ? "green" as const : "amber" as const })),
        ...documents.map((entry) => ({ id: `document-${entry.id}`, date: entry.created_at?.slice(0, 10) || "", icon: "document-outline", title: entry.title || t("documents"), subtitle: entry.category || t("documents"), tone: "blue" as const })),
    ].filter((entry) => entry.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12), [documents, expenses, formatCurrency, formatDistance, reminders, t, trips]);
    const addDocument = () => {
        if (!canCreateDocument) {
            navigation.navigate("Paywall", { source: "document" });
            return;
        }
        navigation.navigate("DocumentForm", { vehicleId });
    };

    const confirmDelete = () => {
        Alert.alert(t("deleteVehicleTitle"), t("deleteVehicleBody"), [
            { text: t("cancel"), style: "cancel" },
            {
                text: t("delete"),
                style: "destructive",
                onPress: () => void (async () => {
                    try {
                        const storedDocuments = await deleteVehicle(dataOwnerId, vehicleId);
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
                    {canWrite ? <Button label={t("edit")} icon="create-outline" compact variant="ghost" onPress={() => navigation.navigate("VehicleForm", { vehicleId })} /> : null}
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
                    <Row
                        icon="document-attach-outline"
                        title={t("addDocument")}
                        onPress={addDocument}
                    />
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
            {history.length ? (
                <View style={styles.section}>
                    <SectionHeader title="Vehicle history" />
                    <Card style={styles.list}>
                        {history.map((entry, index) => (
                            <View key={entry.id}>
                                <Row icon={entry.icon} title={entry.title} subtitle={`${entry.date} · ${entry.subtitle}`} tone={entry.tone} />
                                {index < history.length - 1 ? <View style={styles.divider} /> : null}
                            </View>
                        ))}
                    </Card>
                </View>
            ) : null}
            {canWrite ? <Button label={t("delete")} icon="trash-outline" variant="danger" onPress={confirmDelete} /> : null}
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
