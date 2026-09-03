import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Card, FormField, Row, Screen, SectionHeader, SelectField, TimeField } from "../../components/ui";
import { useSubscription } from "../../billing/SubscriptionProvider";
import { useExpenses, useReportSchedules } from "../../data/liveQueries";
import { releaseFeatures } from "../../config/releaseFeatures";
import { ReportScheduleDraft } from "../../data/models";
import { deleteReportSchedule, saveReportSchedule } from "../../data/repository";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useAuth } from "../../providers/AuthProvider";
import { useGarage } from "../../providers/GarageProvider";
import { exportExpensesCsv } from "../../services/reportExport";
import { colors, spacing, typography } from "../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "ScheduledReports">;

export default function ScheduledReportsScreen({ navigation }: Props) {
    const { vehicles, dataOwnerId } = useGarage();
    const { session } = useAuth();
    const { currency } = usePreferences();
    const { canExportReports } = useSubscription();
    const { data: schedules } = useReportSchedules(dataOwnerId);
    const { data: expenses } = useExpenses(dataOwnerId);
    const [draft, setDraft] = useState<ReportScheduleDraft>({
        userId: dataOwnerId,
        vehicleId: "",
        name: "Monthly vehicle cost report",
        frequency: "monthly",
        format: "pdf",
        deliveryEmail: session?.user.email ?? "",
        dayOfWeek: "1",
        dayOfMonth: "1",
        deliveryTime: "09:00",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        enabled: true,
    });
    const [busy, setBusy] = useState(false);
    const update = <K extends keyof ReportScheduleDraft>(key: K, value: ReportScheduleDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

    const save = async () => {
        if (!canExportReports) {
            navigation.navigate("Paywall", { source: "export" });
            return;
        }
        if (!draft.name.trim() || !/^\S+@\S+\.\S+$/.test(draft.deliveryEmail)) {
            Alert.alert("Scheduled report", "Enter a report name and valid delivery email.");
            return;
        }
        setBusy(true);
        try {
            await saveReportSchedule(draft);
            Alert.alert("Report scheduled", `The next ${draft.format.toUpperCase()} report is queued for ${draft.deliveryTime} in ${draft.timezone}.`);
        } catch (error) {
            Alert.alert("Scheduled report", (error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const remove = (id: string) => Alert.alert("Delete report schedule?", undefined, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void deleteReportSchedule(id, dataOwnerId) },
    ]);

    return (
        <Screen>
            <SectionHeader title="Reports" />
            <Card style={styles.intro}>
                <Text style={styles.title}>Share now</Text>
                <Text style={styles.body}>
                    {releaseFeatures.scheduledReportDelivery
                        ? "Export the currently stored history immediately, or configure automatic weekly and monthly delivery."
                        : "Export the currently stored expense history and share the CSV with any compatible app."}
                </Text>
                <Button label="Share current CSV" icon="share-outline" variant="secondary" onPress={() => canExportReports ? void exportExpensesCsv(expenses, currency) : navigation.navigate("Paywall", { source: "export" })} />
            </Card>
            {releaseFeatures.scheduledReportDelivery ? <SectionHeader title="Automatic delivery" /> : null}
            {releaseFeatures.scheduledReportDelivery && !canExportReports ? (
                <Card style={styles.intro}>
                    <Text style={styles.title}>Scheduled reports are included with Plus</Text>
                    <Text style={styles.body}>Free accounts keep all expense tracking. Plus adds automatic PDF or CSV delivery.</Text>
                    <Button label="Explore AutoCare Plus" icon="sparkles-outline" onPress={() => navigation.navigate("Paywall", { source: "export" })} />
                </Card>
            ) : releaseFeatures.scheduledReportDelivery ? (
                <Card style={styles.form}>
                    <FormField label="Report name" value={draft.name} onChangeText={(value) => update("name", value)} required />
                    <SelectField label="Vehicle" value={draft.vehicleId || "__all__"} onChange={(value) => update("vehicleId", value === "__all__" ? "" : value)} placeholder="All vehicles" options={[{ value: "__all__", label: "All vehicles" }, ...vehicles.map((vehicle) => ({ value: vehicle.id ?? "", label: [vehicle.vehicle_brand, vehicle.vehicle_model, vehicle.vehicle_license_plate].filter(Boolean).join(" · ") }))]} />
                    <SelectField label="Frequency" value={draft.frequency} onChange={(value) => update("frequency", value)} options={[{ value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} />
                    <SelectField label="Format" value={draft.format} onChange={(value) => update("format", value)} options={[{ value: "pdf", label: "PDF" }, { value: "csv", label: "CSV" }]} />
                    {draft.frequency === "weekly" ? <SelectField label="Delivery day" value={draft.dayOfWeek} onChange={(value) => update("dayOfWeek", value)} options={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((label, value) => ({ value: String(value), label }))} /> : <SelectField label="Day of month" value={draft.dayOfMonth} onChange={(value) => update("dayOfMonth", value)} options={["1", "5", "10", "15", "20", "25", "28"].map((value) => ({ value, label: value }))} />}
                    <TimeField label="Delivery time" value={draft.deliveryTime} onChange={(value) => update("deliveryTime", value)} required />
                    <FormField label="Delivery email" value={draft.deliveryEmail} onChangeText={(value) => update("deliveryEmail", value)} keyboardType="email-address" autoCapitalize="none" required />
                    <Text style={styles.hint}>Timezone: {draft.timezone}</Text>
                    <Button label="Schedule report" icon="calendar-outline" onPress={() => void save()} loading={busy} />
                </Card>
            ) : null}
            {releaseFeatures.scheduledReportDelivery && schedules.length ? (
                <>
                    <SectionHeader title="Active schedules" />
                    <Card style={styles.list}>
                        {schedules.map((schedule, index) => (
                            <View key={schedule.id ?? index}>
                                <Row icon={schedule.format === "pdf" ? "document-text-outline" : "grid-outline"} title={schedule.name ?? "Report"} subtitle={`${schedule.frequency} · ${String(schedule.format).toUpperCase()} · next ${schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString() : "not queued"}`} onPress={() => schedule.id && remove(schedule.id)} />
                                {index < schedules.length - 1 ? <View style={styles.divider} /> : null}
                            </View>
                        ))}
                    </Card>
                </>
            ) : null}
        </Screen>
    );
}

const styles = StyleSheet.create({
    intro: { gap: spacing.md },
    title: { ...typography.heading, color: colors.ink },
    body: { ...typography.body, color: colors.inkMuted },
    form: { gap: spacing.lg },
    hint: { ...typography.caption, color: colors.inkMuted },
    list: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
});
