import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Card, ChoiceChips, EmptyState, LoadingState, PageHeader, Row, Screen } from "../../components/ui";
import { VehicleSelectField } from "../../components/VehicleSelectField";
import { useReminders } from "../../data/liveQueries";
import { ReminderState } from "../../data/models";
import { completeReminder, reopenReminder } from "../../data/repository";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useAuth } from "../../providers/AuthProvider";
import { useGarage } from "../../providers/GarageProvider";
import { cancelReminderNotification } from "../../services/reminderNotifications";
import { colors, radius, spacing, typography } from "../../theme/tokens";
import { getReminderState } from "../../utils/tracking";

type Filter = "active" | "completed" | "all";

export default function RemindersScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { userId } = useAuth();
    const { t, formatDistance } = usePreferences();
    const { vehicles, selectedVehicleId } = useGarage();
    const [scope, setScope] = useState(selectedVehicleId || "all");
    const [filter, setFilter] = useState<Filter>("active");
    const { data: reminders, loading } = useReminders(userId, scope === "all" ? undefined : scope);
    const visible = useMemo(() => reminders.filter((reminder) => filter === "all" || (filter === "completed" ? reminder.status === "completed" : reminder.status !== "completed")), [filter, reminders]);

    const toggle = async (id: string, completed: boolean) => {
        try {
            if (completed) await reopenReminder(id, userId);
            else {
                await completeReminder(id, userId);
                await Promise.allSettled([cancelReminderNotification(id)]);
            }
        } catch (error) {
            Alert.alert(t("reminders"), (error as Error).message);
        }
    };

    if (loading) return <Screen><LoadingState /></Screen>;

    return (
        <Screen>
            <PageHeader title={t("reminders")} action={t("addReminder")} onAction={() => navigation.navigate("ReminderForm", { vehicleId: scope === "all" ? selectedVehicleId : scope })} />
            <VehicleSelectField
                vehicles={vehicles}
                value={scope}
                onChange={setScope}
                includeAll
            />
            <ChoiceChips
                value={filter}
                onChange={setFilter}
                options={[
                    { value: "active", label: t("upcoming") },
                    { value: "completed", label: t("completed") },
                    { value: "all", label: t("all") },
                ]}
            />

            {visible.length ? (
                <View style={styles.cards}>
                    {visible.map((reminder) => {
                        const vehicle = vehicles.find((entry) => entry.id === reminder.vehicle_id);
                        const state = getReminderState(reminder, vehicle?.current_mileage ?? 0);
                        const completed = state === "completed";
                        const datedDue = reminder.due_date
                            ? `${reminder.due_date} · ${reminder.due_time?.slice(0, 5) || "09:00"}`
                            : null;
                        const due = [datedDue, reminder.due_mileage ? formatDistance(reminder.due_mileage) : null].filter(Boolean).join(" · ");
                        return (
                            <Card key={reminder.id ?? ""} style={styles.reminderCard}>
                                <Row
                                    icon={reminderIcon(reminder.category ?? "custom")}
                                    tone={stateTone(state)}
                                    title={reminder.title ?? t("reminder")}
                                    subtitle={`${vehicle?.vehicle_license_plate || t("vehicle")} · ${due || t("none")}`}
                                    trailing={<StatusBadge state={state} label={stateLabel(state, t)} />}
                                    onPress={() => navigation.navigate("ReminderForm", { reminderId: reminder.id ?? undefined })}
                                />
                                <Button
                                    label={completed ? t("reopen") : t("markComplete")}
                                    icon={completed ? "refresh-outline" : "checkmark-circle-outline"}
                                    compact
                                    variant={completed ? "ghost" : "secondary"}
                                    onPress={() => void toggle(reminder.id ?? "", completed)}
                                />
                            </Card>
                        );
                    })}
                </View>
            ) : (
                <EmptyState icon="notifications-outline" title={t("noReminders")} body={t("noRemindersBody")} action={t("addReminder")} onAction={() => navigation.navigate("ReminderForm", { vehicleId: scope === "all" ? selectedVehicleId : scope })} />
            )}
        </Screen>
    );
}

function StatusBadge({ state, label }: { state: ReminderState; label: string }) {
    return <View style={[styles.badge, styles[`badge_${state}`]]}><Text style={[styles.badgeText, styles[`badgeText_${state}`]]}>{label}</Text></View>;
}

const stateLabel = (state: ReminderState, t: ReturnType<typeof usePreferences>["t"]) => ({ overdue: t("dueNow"), dueSoon: t("dueSoon"), upcoming: t("upcoming"), completed: t("completed") }[state]);
const stateTone = (state: ReminderState) => ({ overdue: "red", dueSoon: "amber", upcoming: "blue", completed: "green" }[state] as "red" | "amber" | "blue" | "green");
const reminderIcon = (category: string) => ({ maintenance: "construct-outline", inspection: "shield-checkmark-outline", insurance: "umbrella-outline", document: "document-text-outline", custom: "notifications-outline" }[category] ?? "notifications-outline");

const styles = StyleSheet.create({
    cards: { gap: spacing.md },
    reminderCard: { gap: spacing.md },
    badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5 },
    badgeText: { ...typography.label, fontSize: 11 },
    badge_overdue: { backgroundColor: colors.dangerSoft },
    badge_dueSoon: { backgroundColor: colors.warningSoft },
    badge_upcoming: { backgroundColor: colors.primarySoft },
    badge_completed: { backgroundColor: colors.successSoft },
    badgeText_overdue: { color: colors.danger },
    badgeText_dueSoon: { color: "#9A6500" },
    badgeText_upcoming: { color: colors.primary },
    badgeText_completed: { color: colors.success },
});
