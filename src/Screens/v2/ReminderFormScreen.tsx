import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Card, ChoiceChips, DateField, FormField, LoadingState, PresetOrCustomField, Screen, SectionHeader, SelectField, TimeField } from "../../components/ui";
import { VehicleSelectField } from "../../components/VehicleSelectField";
import { useReminders } from "../../data/liveQueries";
import { ReminderDraft } from "../../data/models";
import { deleteReminder, saveReminder } from "../../data/repository";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useGarage } from "../../providers/GarageProvider";
import {
    DEFAULT_REMINDER_TIME,
    cancelReminderNotification,
    getReminderNotificationContent,
    requestReminderNotificationPermission,
    scheduleReminderNotification,
    sendReminderTestNotification,
} from "../../services/reminderNotifications";
import { colors, spacing, typography } from "../../theme/tokens";
import { isIsoDate, isIsoTime, toNumber } from "../../utils/tracking";
import { useSubscription } from "../../billing/SubscriptionProvider";

type Props = NativeStackScreenProps<RootStackParamList, "ReminderForm">;

export default function ReminderFormScreen({ route, navigation }: Props) {
    const reminderId = route.params?.reminderId;
    const { vehicles, selectedVehicleId, dataOwnerId, canWrite } = useGarage();
    const { t, distanceUnit } = usePreferences();
    const { canCreateRecurringReminder } = useSubscription();
    const systemLabels = useMemo(() => ({
        channelName: t("vehicleRemindersChannel"),
        channelDescription: t("vehicleRemindersChannelBody"),
        open: t("openReminder"),
        markComplete: t("markComplete"),
    }), [t]);
    const { data: reminders, loading } = useReminders(dataOwnerId);
    const source = reminders.find((reminder) => reminder.id === reminderId);
    const [draft, setDraft] = useState<ReminderDraft>({
        id: reminderId,
        userId: dataOwnerId,
        vehicleId: route.params?.vehicleId || selectedVehicleId,
        title: "",
        category: "maintenance",
        dueDate: "",
        dueTime: DEFAULT_REMINDER_TIME,
        dueMileage: "",
        repeatMonths: "",
        repeatKm: "",
        priority: "medium",
        notifyBeforeMinutes: "0",
        notificationTitle: "",
        notificationBody: "",
        notes: "",
    });
    const [busy, setBusy] = useState(false);
    const [testingNotification, setTestingNotification] = useState(false);
    const [template, setTemplate] = useState("");
    const maintenanceTemplates = [
        { value: "oil", label: t("oilFilterChange"), title: t("oilFilterChange"), category: "maintenance", months: "12", km: "15000" },
        { value: "tyres", label: t("tyreRotationCheck"), title: t("tyreRotationCheck"), category: "maintenance", months: "6", km: "10000" },
        { value: "inspection", label: t("vehicleInspection"), title: t("vehicleInspection"), category: "inspection", months: "12", km: "" },
        { value: "insurance", label: t("insuranceRenewal"), title: t("insuranceRenewal"), category: "insurance", months: "12", km: "" },
        { value: "brake-fluid", label: t("brakeFluid"), title: t("brakeFluidReplacement"), category: "maintenance", months: "24", km: "" },
        { value: "battery", label: t("batteryHealthCheck"), title: t("batteryHealthCheck"), category: "maintenance", months: "12", km: "" },
    ];

    useEffect(() => {
        if (!source) return;
        const displayDistance = (value: number | null) => value === null ? "" : String(Math.round(distanceUnit === "mi" ? value * 0.621371 : value));
        setDraft({
            id: source.id ?? undefined,
            userId: dataOwnerId,
            vehicleId: source.vehicle_id ?? "",
            title: source.title ?? "",
            category: source.category ?? "maintenance",
            dueDate: source.due_date ?? "",
            dueTime: source.due_time?.slice(0, 5) || DEFAULT_REMINDER_TIME,
            dueMileage: displayDistance(source.due_mileage),
            repeatMonths: String(source.repeat_months ?? ""),
            repeatKm: displayDistance(source.repeat_km),
            priority: source.priority ?? "medium",
            notifyBeforeMinutes: String(source.notify_before_minutes ?? 0),
            notificationTitle: source.notification_title ?? "",
            notificationBody: source.notification_body ?? "",
            notes: source.notes ?? "",
        });
    }, [dataOwnerId, distanceUnit, source]);

    const update = <K extends keyof ReminderDraft>(key: K, value: ReminderDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
    const selectedVehicle = vehicles.find((entry) => entry.id === draft.vehicleId);
    const vehicleLabel = [selectedVehicle?.vehicle_brand, selectedVehicle?.vehicle_model, selectedVehicle?.vehicle_license_plate]
        .filter(Boolean)
        .join(" · ") || t("vehicle");
    const notificationContent = draft.dueDate
        ? getReminderNotificationContent({
            title: draft.title.trim() || t("reminder"),
            dueDate: draft.dueDate,
            dueTime: draft.dueTime,
            vehicleLabel,
            dueLabel: t("dueDate"),
            notificationTitle: draft.notificationTitle,
            notificationBody: draft.notificationBody,
        })
        : { title: draft.title.trim() || t("reminder"), body: t("notificationRequiresDate") };

    const sendPreviewNotification = async () => {
        if (!draft.title.trim() || !draft.dueDate) return;
        setTestingNotification(true);
        try {
            const granted = await requestReminderNotificationPermission(systemLabels);
            if (!granted) {
                Alert.alert(t("notificationsDisabled"), t("notificationPermissionDenied"));
                return;
            }
            await sendReminderTestNotification(notificationContent.title, notificationContent.body, systemLabels);
            Alert.alert(t("notifications"), t("notificationTestSent"));
        } catch (error) {
            Alert.alert(t("notifications"), (error as Error).message);
        } finally {
            setTestingNotification(false);
        }
    };

    const submit = async () => {
        if (!canWrite) {
            Alert.alert(t("reminder"), t("viewOnlyGarage"));
            return;
        }
        if (!canCreateRecurringReminder && (toNumber(draft.repeatMonths) > 0 || toNumber(draft.repeatKm) > 0)) {
            navigation.navigate("Paywall", { source: "reminder" });
            return;
        }
        if (!draft.title.trim() || !draft.vehicleId || (!draft.dueDate && !draft.dueMileage) || (draft.dueDate && (!isIsoDate(draft.dueDate) || !isIsoTime(draft.dueTime)))) {
            const invalidDateTime = draft.dueDate && (!isIsoDate(draft.dueDate) ? t("invalidDate") : !isIsoTime(draft.dueTime) ? t("invalidTime") : undefined);
            Alert.alert(t("reminder"), invalidDateTime || t("requiredFields"));
            return;
        }
        setBusy(true);
        try {
            const storedDistance = (value: string) => distanceUnit === "mi" && value ? String(Math.round(toNumber(value) / 0.621371)) : value;
            const savedId = await saveReminder({ ...draft, dueMileage: storedDistance(draft.dueMileage), repeatKm: storedDistance(draft.repeatKm) });
            let notificationWarning: string | undefined;
            try {
                if (draft.dueDate) {
                    const granted = await requestReminderNotificationPermission(systemLabels);
                    if (!granted) notificationWarning = t("notificationPermissionDenied");
                    else {
                        await scheduleReminderNotification({ reminderId: savedId, title: draft.title.trim(), dueDate: draft.dueDate, dueTime: draft.dueTime, vehicleLabel, dueLabel: t("dueDate"), notifyBeforeMinutes: toNumber(draft.notifyBeforeMinutes), notificationTitle: draft.notificationTitle, notificationBody: draft.notificationBody, systemLabels });
                    }
                } else {
                    await cancelReminderNotification(savedId);
                }
            } catch {
                notificationWarning = t("notificationPermissionDenied");
            }
            Alert.alert(t(reminderId ? "reminderUpdated" : "reminderSaved"), notificationWarning);
            navigation.goBack();
        } catch (error) {
            Alert.alert(t("reminder"), (error as Error).message);
        } finally {
            setBusy(false);
        }
    };
    const confirmDelete = () => reminderId && Alert.alert(t("delete"), undefined, [
        { text: t("cancel"), style: "cancel" },
        { text: t("delete"), style: "destructive", onPress: () => void (async () => {
            await Promise.allSettled([cancelReminderNotification(reminderId)]);
            await deleteReminder(reminderId, dataOwnerId);
            navigation.goBack();
        })() },
    ]);

    if (reminderId && loading && !source) return <Screen><LoadingState /></Screen>;
    return (
        <Screen>
            <SectionHeader title={reminderId ? t("editReminder") : t("addReminder")} />
            <Card style={styles.form}>
                <VehicleSelectField vehicles={vehicles} value={draft.vehicleId} onChange={(value) => update("vehicleId", value)} />
                {!reminderId ? <SelectField label={t("maintenanceTemplate")} value={template} onChange={(value) => {
                    setTemplate(value);
                    const preset = maintenanceTemplates.find((entry) => entry.value === value);
                    if (preset) setDraft((current) => ({ ...current, title: preset.title, category: preset.category, repeatMonths: preset.months, repeatKm: preset.km }));
                }} placeholder={t("startFromPreset")} options={maintenanceTemplates.map(({ value, label }) => ({ value, label }))} /> : null}
                <FormField label={t("reminderTitle")} value={draft.title} onChangeText={(value) => update("title", value)} required />
                <Text style={styles.label}>{t("reminderCategory")}</Text>
                <ChoiceChips
                    value={draft.category}
                    onChange={(value) => update("category", value)}
                    options={[
                        { value: "maintenance", label: t("maintenance") },
                        { value: "inspection", label: t("inspection") },
                        { value: "insurance", label: t("insurance") },
                        { value: "document", label: t("documentExpiry") },
                        { value: "custom", label: t("custom") },
                    ]}
                />
                <DateField label={t("dueDate")} value={draft.dueDate} onChange={(value) => update("dueDate", value)} hint={t("optional")} />
                <TimeField label={t("reminderTime")} value={draft.dueTime} onChange={(value) => update("dueTime", value)} required={Boolean(draft.dueDate)} />
                <PresetOrCustomField
                    label={t("notifyBefore")}
                    value={draft.notifyBeforeMinutes}
                    onChange={(value) => update("notifyBeforeMinutes", value)}
                    keyboardType="number-pad"
                    options={[
                        { value: "0", label: t("atDueTime") },
                        { value: "60", label: t("oneHourBefore") },
                        { value: "1440", label: t("oneDayBefore") },
                        { value: "10080", label: t("oneWeekBefore") },
                        { value: "43200", label: t("thirtyDaysBefore") },
                    ]}
                    customLabel={t("minutesBefore")}
                />
                <Text style={styles.fieldHint}>{draft.dueDate ? t("notificationTimeHint") : t("notificationRequiresDate")}</Text>
                <View style={styles.notificationPreview}>
                    <Text style={styles.previewTitle}>{t("notificationPreview")}</Text>
                    <Text style={styles.previewLabel}>{t("notificationHeader")}</Text>
                    <Text style={styles.previewValue}>{notificationContent.title}</Text>
                    <Text style={styles.previewLabel}>{t("notificationMessage")}</Text>
                    <Text style={styles.previewValue}>{notificationContent.body}</Text>
                    <FormField label={t("customNotificationTitle")} value={draft.notificationTitle} onChangeText={(value) => update("notificationTitle", value)} hint={t("notificationTitleHint")} />
                    <FormField label={t("customNotificationMessage")} value={draft.notificationBody} onChangeText={(value) => update("notificationBody", value)} hint={t("notificationMessageHint")} multiline />
                    <Button
                        label={t("sendPreviewNotification")}
                        icon="notifications-outline"
                        variant="secondary"
                        onPress={() => void sendPreviewNotification()}
                        loading={testingNotification}
                        disabled={!draft.title.trim() || !draft.dueDate}
                    />
                </View>
                <FormField label={`${t("dueMileage")} (${distanceUnit})`} value={draft.dueMileage} onChangeText={(value) => update("dueMileage", value)} keyboardType="decimal-pad" hint={t("optional")} />
                {canCreateRecurringReminder ? (
                    <>
                        <PresetOrCustomField
                            label={t("repeatMonths")}
                            value={draft.repeatMonths}
                            onChange={(value) => update("repeatMonths", value)}
                            clearLabel={t("doesNotRepeat")}
                            keyboardType="number-pad"
                            options={["1", "3", "6", "12", "24"].map((value) => ({ value, label: value }))}
                        />
                        <PresetOrCustomField
                            label={distanceUnit === "km" ? t("repeatKm") : `${t("repeatKm").replace("(km)", "").trim()} (${distanceUnit})`}
                            value={draft.repeatKm}
                            onChange={(value) => update("repeatKm", value)}
                            clearLabel={t("doesNotRepeat")}
                            keyboardType="number-pad"
                            options={["5000", "10000", "15000", "20000", "30000"].map((value) => ({ value, label: Number(value).toLocaleString() }))}
                        />
                    </>
                ) : (
                    <View style={styles.plusGate}>
                        <Text style={styles.plusGateTitle}>{t("recurringRemindersPlus")}</Text>
                        <Text style={styles.plusGateBody}>{t("recurringRemindersBody")}</Text>
                        <Button label={t("explorePlus")} icon="repeat-outline" variant="secondary" onPress={() => navigation.navigate("Paywall", { source: "reminder" })} />
                    </View>
                )}
                <Text style={styles.label}>{t("priority")}</Text>
                <ChoiceChips value={draft.priority} onChange={(value) => update("priority", value)} options={[{ value: "low", label: t("low") }, { value: "medium", label: t("medium") }, { value: "high", label: t("high") }]} />
                <FormField label={t("notes")} value={draft.notes} onChangeText={(value) => update("notes", value)} multiline />
            </Card>
            <Button label={t("save")} icon="checkmark" onPress={submit} loading={busy} />
            {reminderId ? <Button label={t("delete")} icon="trash-outline" variant="danger" onPress={confirmDelete} /> : null}
        </Screen>
    );
}

const styles = StyleSheet.create({
    form: { gap: spacing.lg },
    label: { ...typography.label, color: colors.ink, marginBottom: -spacing.sm },
    fieldHint: { ...typography.caption, color: colors.inkMuted, marginTop: -spacing.md },
    notificationPreview: { gap: spacing.sm, padding: spacing.md, borderRadius: 16, backgroundColor: colors.primarySoft },
    plusGate: { gap: spacing.sm, padding: spacing.md, borderRadius: 16, backgroundColor: colors.primarySoft },
    plusGateTitle: { ...typography.bodyStrong, color: colors.ink },
    plusGateBody: { ...typography.caption, color: colors.inkMuted },
    previewTitle: { ...typography.heading, color: colors.ink },
    previewLabel: { ...typography.caption, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: 0.6 },
    previewValue: { ...typography.body, color: colors.ink, marginBottom: spacing.xs },
});
