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
    const { currency, locale, t } = usePreferences();
    const { canExportReports } = useSubscription();
    const { data: schedules } = useReportSchedules(dataOwnerId);
    const { data: expenses } = useExpenses(dataOwnerId);
    const [draft, setDraft] = useState<ReportScheduleDraft>({
        userId: dataOwnerId,
        vehicleId: "",
        name: t("monthlyVehicleCostReport"),
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
            Alert.alert(t("scheduledReport"), t("reportValidation"));
            return;
        }
        setBusy(true);
        try {
            await saveReportSchedule(draft);
            Alert.alert(t("reportScheduled"), t("reportScheduledBody", { format: draft.format.toUpperCase(), time: draft.deliveryTime, timezone: draft.timezone }));
        } catch (error) {
            Alert.alert(t("scheduledReport"), (error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const remove = (id: string) => Alert.alert(t("deleteReportSchedule"), undefined, [
        { text: t("cancel"), style: "cancel" },
        { text: t("delete"), style: "destructive", onPress: () => void deleteReportSchedule(id, dataOwnerId) },
    ]);
    const shareCurrent = async () => {
        if (!canExportReports) {
            navigation.navigate("Paywall", { source: "export" });
            return;
        }
        try {
            await exportExpensesCsv(expenses, currency, t("sharingUnavailable"), t("expenseReportDialog"));
        } catch (error) {
            Alert.alert(t("exportCsv"), (error as Error).message);
        }
    };

    return (
        <Screen>
            <SectionHeader title={t("scheduledReports")} />
            <Card style={styles.intro}>
                <Text style={styles.title}>{t("shareNow")}</Text>
                <Text style={styles.body}>
                    {releaseFeatures.scheduledReportDelivery
                        ? t("reportShareScheduledBody")
                        : t("reportShareBody")}
                </Text>
                <Button label={t("shareCurrentCsv")} icon="share-outline" variant="secondary" onPress={() => void shareCurrent()} />
            </Card>
            {releaseFeatures.scheduledReportDelivery ? <SectionHeader title={t("automaticDelivery")} /> : null}
            {releaseFeatures.scheduledReportDelivery && !canExportReports ? (
                <Card style={styles.intro}>
                    <Text style={styles.title}>{t("scheduledReportsPlus")}</Text>
                    <Text style={styles.body}>{t("scheduledReportsPlusBody")}</Text>
                    <Button label={t("explorePlus")} icon="sparkles-outline" onPress={() => navigation.navigate("Paywall", { source: "export" })} />
                </Card>
            ) : releaseFeatures.scheduledReportDelivery ? (
                <Card style={styles.form}>
                    <FormField label={t("reportName")} value={draft.name} onChangeText={(value) => update("name", value)} required />
                    <SelectField label={t("vehicle")} value={draft.vehicleId || "__all__"} onChange={(value) => update("vehicleId", value === "__all__" ? "" : value)} placeholder={t("allVehicles")} options={[{ value: "__all__", label: t("allVehicles") }, ...vehicles.map((vehicle) => ({ value: vehicle.id ?? "", label: [vehicle.vehicle_brand, vehicle.vehicle_model, vehicle.vehicle_license_plate].filter(Boolean).join(" · ") }))]} />
                    <SelectField label={t("frequency")} value={draft.frequency} onChange={(value) => update("frequency", value)} options={[{ value: "weekly", label: t("weekly") }, { value: "monthly", label: t("monthly") }]} />
                    <SelectField label={t("format")} value={draft.format} onChange={(value) => update("format", value)} options={[{ value: "pdf", label: "PDF" }, { value: "csv", label: "CSV" }]} />
                    {draft.frequency === "weekly" ? <SelectField label={t("deliveryDay")} value={draft.dayOfWeek} onChange={(value) => update("dayOfWeek", value)} options={Array.from({ length: 7 }, (_, value) => ({ value: String(value), label: new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date(2021, 7, 1 + value, 12)) }))} /> : <SelectField label={t("dayOfMonth")} value={draft.dayOfMonth} onChange={(value) => update("dayOfMonth", value)} options={["1", "5", "10", "15", "20", "25", "28"].map((value) => ({ value, label: value }))} />}
                    <TimeField label={t("deliveryTime")} value={draft.deliveryTime} onChange={(value) => update("deliveryTime", value)} required />
                    <FormField label={t("deliveryEmail")} value={draft.deliveryEmail} onChangeText={(value) => update("deliveryEmail", value)} keyboardType="email-address" autoCapitalize="none" required />
                    <Text style={styles.hint}>{t("timezone", { timezone: draft.timezone })}</Text>
                    <Button label={t("scheduleReport")} icon="calendar-outline" onPress={() => void save()} loading={busy} />
                </Card>
            ) : null}
            {releaseFeatures.scheduledReportDelivery && schedules.length ? (
                <>
                    <SectionHeader title={t("activeSchedules")} />
                    <Card style={styles.list}>
                        {schedules.map((schedule, index) => (
                            <View key={schedule.id ?? index}>
                                <Row icon={schedule.format === "pdf" ? "document-text-outline" : "grid-outline"} title={schedule.name ?? t("report")} subtitle={t("nextRun", { frequency: schedule.frequency === "weekly" ? t("weekly") : t("monthly"), format: String(schedule.format).toUpperCase(), date: schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString(locale) : t("notQueued") })} onPress={() => schedule.id && remove(schedule.id)} />
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
