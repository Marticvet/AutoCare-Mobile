import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, LoadingState, MetricCard, Row, Screen, SectionHeader } from "../../components/ui";
import { VehicleSelectField } from "../../components/VehicleSelectField";
import { useSubscription } from "../../billing/SubscriptionProvider";
import { useExpenses, useFuelLogs, useReminders } from "../../data/liveQueries";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useAuth } from "../../providers/AuthProvider";
import { useGarage } from "../../providers/GarageProvider";
import { colors, radius, shadow, spacing, typography } from "../../theme/tokens";
import { calculateFuelConsumption } from "../../utils/fuel";
import { getReminderState, isoDate, totalExpenses } from "../../utils/tracking";
import { expenseCategoryPresentation } from "../../utils/expenseCategory";

export default function DashboardScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { profile } = useAuth();
    const { t, formatCurrency, formatDate, formatDistance, formatNumber } = usePreferences();
    const { vehicles, selectedVehicle, selectedVehicleId, selectVehicle, loading, dataOwnerId, canWrite } = useGarage();
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
    const fuelConsumption = useMemo(() => calculateFuelConsumption(fuelLogs), [fuelLogs]);
    const economy = fuelConsumption.litresPer100Km;
    const [quickAddVisible, setQuickAddVisible] = useState(false);
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
                    body={canWrite ? t("firstVehicleBody") : t("viewOnlyGarage")}
                    action={canWrite ? t("addFirstVehicle") : undefined}
                    onAction={canWrite ? () => navigation.navigate("VehicleForm") : undefined}
                />
                {canWrite ? (
                    <Card style={styles.firstVehicleBenefits}>
                        <FirstVehicleBenefit icon="receipt-outline" text={t("firstVehicleCosts")} />
                        <FirstVehicleBenefit icon="notifications-outline" text={t("firstVehicleReminders")} />
                        <FirstVehicleBenefit icon="documents-outline" text={t("firstVehicleHistory")} />
                    </Card>
                ) : null}
            </Screen>
        );
    }

    const greetingName = profile?.first_name || profile?.full_name?.split(" ")[0] || "";
    const openQuickAction = (action: "fuel" | "expense" | "reminder" | "document") => {
        setQuickAddVisible(false);
        if (action === "fuel") navigation.navigate("ExpenseForm", { category: "fuel" });
        if (action === "expense") navigation.navigate("ExpenseForm", { category: "other" });
        if (action === "reminder") navigation.navigate("ReminderForm");
        if (action === "document") addDocument();
    };

    return (
        <View style={styles.container}>
        <Screen contentStyle={styles.screenContent}>
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
                <MetricCard label={t("fuelEconomy")} value={economy ? `${formatNumber(economy, 1)} L/100 km` : "—"} icon="leaf-outline" tone="amber" />
            </View>
            {economy === null ? <Text style={styles.metricHint}>{t("fuelConsumptionNeedsData")}</Text> : null}

            <View style={styles.section}>
                <SectionHeader title={t("recentExpenses")} action={t("viewAll")} onAction={() => navigation.navigate("Main", { screen: "Expenses" } as never)} />
                <Card style={styles.listCard}>
                    {expenses.slice(0, 4).map((expense, index) => (
                        <View key={`${expense.source}-${expense.id}`}>
                            <Row
                                icon={expenseCategoryPresentation(expense.category).icon}
                                title={expense.title}
                                subtitle={`${formatDate(expense.date)} · ${vehicles.find((vehicle) => vehicle.id === expense.vehicle_id)?.vehicle_license_plate ?? ""}`}
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
        <Pressable
            onPress={() => setQuickAddVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t("quickAdd")}
            style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        >
            <Ionicons name="add" size={30} color={colors.white} />
        </Pressable>
        <Modal transparent visible={quickAddVisible} animationType="fade" onRequestClose={() => setQuickAddVisible(false)}>
            <Pressable style={styles.quickOverlay} onPress={() => setQuickAddVisible(false)}>
                <View style={styles.quickSheet} onStartShouldSetResponder={() => true}>
                    <View style={styles.quickHeader}>
                        <Text style={styles.quickTitle}>{t("quickAdd")}</Text>
                        <Pressable onPress={() => setQuickAddVisible(false)} accessibilityRole="button" accessibilityLabel={t("close")} hitSlop={10}>
                            <Ionicons name="close" size={24} color={colors.ink} />
                        </Pressable>
                    </View>
                    <QuickAction icon="water-outline" label={t("addFuel")} onPress={() => openQuickAction("fuel")} />
                    <QuickAction icon="receipt-outline" label={t("addExpense")} onPress={() => openQuickAction("expense")} />
                    <QuickAction icon="notifications-outline" label={t("addReminder")} onPress={() => openQuickAction("reminder")} />
                    <QuickAction icon="document-attach-outline" label={t("addDocument")} onPress={() => openQuickAction("document")} />
                </View>
            </Pressable>
        </Modal>
        </View>
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

function FirstVehicleBenefit({ icon, text }: { icon: string; text: string }) {
    return <View style={styles.firstVehicleBenefit}><Ionicons name={icon as never} size={20} color={colors.primary} /><Text style={styles.firstVehicleBenefitText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    screenContent: { paddingBottom: 104 },
    centered: { justifyContent: "center" },
    firstVehicleBenefits: { width: "100%", maxWidth: 520, alignSelf: "center", gap: spacing.md },
    firstVehicleBenefit: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    firstVehicleBenefitText: { ...typography.body, color: colors.ink, flex: 1 },
    hero: { minHeight: 128, borderRadius: radius.xl, padding: spacing.xl, backgroundColor: colors.brandNavy, flexDirection: "row", alignItems: "center", justifyContent: "space-between", overflow: "hidden" },
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
    metricHint: { ...typography.caption, color: colors.inkMuted, marginTop: -spacing.sm },
    section: { gap: spacing.md },
    action: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    actionIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
    actionLabel: { ...typography.bodyStrong, color: colors.ink, flex: 1 },
    pressed: { opacity: 0.65 },
    listCard: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
    amount: { ...typography.bodyStrong, color: colors.ink },
    emptyInline: { ...typography.body, color: colors.inkMuted, textAlign: "center", padding: spacing.xl },
    fab: { position: "absolute", right: spacing.xl, bottom: spacing.xl, width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryFill, ...shadow, zIndex: 5 },
    quickOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(11, 23, 48, 0.44)", padding: spacing.md },
    quickSheet: { width: "100%", maxWidth: 560, alignSelf: "center", borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.sm, ...shadow },
    quickHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: spacing.sm },
    quickTitle: { ...typography.heading, color: colors.ink },
});
