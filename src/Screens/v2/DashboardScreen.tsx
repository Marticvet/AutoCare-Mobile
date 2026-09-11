import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, LoadingState, MetricCard, Row, Screen, SectionHeader } from "../../components/ui";
import { VehicleSelectField } from "../../components/VehicleSelectField";
import { useSubscription } from "../../billing/SubscriptionProvider";
import { useExpenses, useFuelLogs, useReminders } from "../../data/liveQueries";
import { ExpenseCategory } from "../../data/models";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useAuth } from "../../providers/AuthProvider";
import { useGarage } from "../../providers/GarageProvider";
import { colors, radius, spacing, typography } from "../../theme/tokens";
import { calculateFuelEconomy, getReminderState, isoDate, totalExpenses } from "../../utils/tracking";

export default function DashboardScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { profile } = useAuth();
    const { t, formatCurrency, formatDistance } = usePreferences();
    const { vehicles, selectedVehicle, selectedVehicleId, selectVehicle, loading, dataOwnerId } = useGarage();
    const { canCreateDocument } = useSubscription();
    const { data: expenses, loading: expensesLoading } = useExpenses(dataOwnerId);
    const { data: reminders, loading: remindersLoading } = useReminders(dataOwnerId);
    const { data: fuelLogs, loading: fuelLogsLoading } = useFuelLogs(dataOwnerId, selectedVehicleId);

    const monthly = useMemo(() => {
        const month = isoDate().slice(0, 7);
        return totalExpenses(expenses.filter((expense) => expense.date.startsWith(month)));
    }, [expenses]);
    const overdueCount = useMemo(
        () =>
            reminders.filter((reminder) => {
                const mileage = vehicles.find((vehicle) => vehicle.id === reminder.vehicle_id)?.current_mileage ?? 0;
                return getReminderState(reminder, mileage) === "overdue";
            }).length,
        [reminders, vehicles]
    );
    const economy = useMemo(() => calculateFuelEconomy(fuelLogs), [fuelLogs]);
    const addDocument = () => {
        if (!canCreateDocument) {
            navigation.navigate("Paywall", { source: "document" });
            return;
        }
        navigation.navigate("DocumentForm");
    };

    if (loading || expensesLoading || remindersLoading || fuelLogsLoading) return <Screen><LoadingState /></Screen>;
    if (!vehicles.length) {
        return (
            <Screen contentStyle={styles.centered}>
                <EmptyState
                    icon="car-sport-outline"
                    title={t("noVehicles")}
                    body={t("noVehiclesBody")}
                    action={t("addVehicle")}
                    onAction={() => navigation.navigate("VehicleForm")}
                />
            </Screen>
        );
    }

    const greetingName = profile?.first_name || profile?.full_name?.split(" ")[0] || "";
    return (
        <Screen>
            <View style={styles.hero}>
                <View style={styles.heroText}>
                    <Text style={styles.eyebrow}>{t("garageOverview")}</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68} style={styles.heroTitle}>{greetingName ? `${t("garageOverview")} · ${greetingName}` : t("appName")}</Text>
                </View>
                <View style={styles.heroIcon}><Ionicons name="speedometer-outline" size={26} color={colors.white} style={styles.heroIconGlyph} /></View>
            </View>

            <View style={styles.selectorBlock}>
                <VehicleSelectField
                    label={t("selectedVehicle")}
                    vehicles={vehicles}
                    value={selectedVehicleId}
                    onChange={(value) => void selectVehicle(value)}
                />
            </View>

            {selectedVehicle ? (
                <Pressable onPress={() => navigation.navigate("VehicleDetail", { vehicleId: selectedVehicleId })}>
                    <Card style={styles.vehicleCard}>
                        <View style={styles.vehicleBadge}><Ionicons name="car-sport" size={30} color={colors.primary} /></View>
                        <View style={styles.vehicleInfo}>
                            <Text style={styles.vehicleName}>{selectedVehicle.vehicle_brand} {selectedVehicle.vehicle_model}</Text>
                            <Text style={styles.vehicleMeta}>{selectedVehicle.vehicle_license_plate || "—"} · {formatDistance(selectedVehicle.current_mileage ?? 0)}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color={colors.inkMuted} />
                    </Card>
                </Pressable>
            ) : null}

            <View style={styles.metrics}>
                <MetricCard label={t("totalSpend")} value={formatCurrency(totalExpenses(expenses))} icon="wallet-outline" />
                <MetricCard label={t("thisMonth")} value={formatCurrency(monthly)} icon="calendar-outline" tone="green" />
                <MetricCard label={t("overdue")} value={String(overdueCount)} icon="warning-outline" tone={overdueCount ? "red" : "green"} />
                <MetricCard label={t("fuelEconomy")} value={economy ? `${economy.toFixed(1)} L/100` : "—"} icon="leaf-outline" tone="amber" />
            </View>

            <View style={styles.section}>
                <SectionHeader title={t("quickActions")} />
                <Card style={styles.actionCard}>
                    <QuickAction icon="receipt-outline" label={t("addExpense")} onPress={() => navigation.navigate("ExpenseForm", { category: "fuel" })} />
                    <QuickAction icon="notifications-outline" label={t("addReminder")} onPress={() => navigation.navigate("ReminderForm")} />
                    <QuickAction
                        icon="document-attach-outline"
                        label={t("addDocument")}
                        onPress={addDocument}
                    />
                </Card>
            </View>

            <View style={styles.section}>
                <SectionHeader title={t("recentExpenses")} action={t("viewAll")} onAction={() => navigation.navigate("Main", { screen: "Expenses" } as never)} />
                <Card style={styles.listCard}>
                    {expenses.slice(0, 4).map((expense, index) => (
                        <View key={`${expense.source}-${expense.id}`}>
                            <Row
                                icon={expenseIcon(expense.category)}
                                title={expense.title}
                                subtitle={`${expense.date} · ${vehicles.find((vehicle) => vehicle.id === expense.vehicle_id)?.vehicle_license_plate ?? ""}`}
                                trailing={<Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>}
                                onPress={() => navigation.navigate("ExpenseForm", { expenseId: expense.id, source: expense.source })}
                            />
                            {index < Math.min(expenses.length, 4) - 1 ? <View style={styles.divider} /> : null}
                        </View>
                    ))}
                    {!expenses.length ? <Text style={styles.emptyInline}>{t("noExpensesBody")}</Text> : null}
                </Card>
            </View>
        </Screen>
    );
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]} accessibilityRole="button">
            <View style={styles.actionIcon}><Ionicons name={icon as never} size={22} color={colors.primary} /></View>
            <Text style={styles.actionLabel}>{label}</Text>
        </Pressable>
    );
}

const expenseIcon = (category: ExpenseCategory) => ({ fuel: "water-outline", charging: "flash-outline", service: "construct-outline", insurance: "shield-checkmark-outline", parking: "car-outline", toll: "trail-sign-outline", tax: "document-text-outline", wash: "sparkles-outline", repair: "hammer-outline", other: "receipt-outline" }[category]);

const styles = StyleSheet.create({
    centered: { justifyContent: "center" },
    hero: { minHeight: 128, borderRadius: radius.xl, padding: spacing.xl, backgroundColor: colors.ink, flexDirection: "row", alignItems: "center", justifyContent: "space-between", overflow: "hidden" },
    heroText: { flex: 1, minWidth: 0, gap: spacing.xs },
    eyebrow: { ...typography.label, color: "rgba(255,255,255,0.68)", textTransform: "uppercase", letterSpacing: 1 },
    heroTitle: { ...typography.title, color: colors.white },
    heroIcon: { width: 56, height: 56, flexShrink: 0, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
    heroIconGlyph: { width: 28, textAlign: "center" },
    selectorBlock: { gap: spacing.md },
    vehicleCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    vehicleBadge: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
    vehicleInfo: { flex: 1, minWidth: 0, gap: 3 },
    vehicleName: { ...typography.heading, color: colors.ink },
    vehicleMeta: { ...typography.caption, color: colors.inkMuted },
    metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    section: { gap: spacing.md },
    actionCard: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingVertical: spacing.md },
    action: { flexGrow: 1, flexBasis: 96, minWidth: 0, alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
    actionIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
    actionLabel: { ...typography.label, color: colors.ink, textAlign: "center" },
    pressed: { opacity: 0.65 },
    listCard: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
    amount: { ...typography.bodyStrong, color: colors.ink },
    emptyInline: { ...typography.body, color: colors.inkMuted, textAlign: "center", padding: spacing.xl },
});
