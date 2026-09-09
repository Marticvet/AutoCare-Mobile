import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Card, DateField, FormField, LoadingState, MetricCard, Screen, SectionHeader } from "../../components/ui";
import { VehicleSelectField } from "../../components/VehicleSelectField";
import { useExpenses, useReminders, useTrips, useVehicleBudgets } from "../../data/liveQueries";
import { VehicleBudgetDraft, VehicleBudgetRecord } from "../../data/models";
import { saveVehicleBudget } from "../../data/repository";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { useSystem } from "../../powersync/PowerSync";
import { useGarage } from "../../providers/GarageProvider";
import { colors, spacing, typography } from "../../theme/tokens";
import { toNumber } from "../../utils/tracking";

export default function OwnershipScreen() {
    const { vehicles, selectedVehicleId, dataOwnerId, canWrite } = useGarage();
    const { supabaseConnector } = useSystem();
    const { formatCurrency, formatDistance, t } = usePreferences();
    const [vehicleId, setVehicleId] = useState(selectedVehicleId || vehicles[0]?.id || "");
    const { data: expenses, loading: expensesLoading } = useExpenses(dataOwnerId, vehicleId);
    const { data: trips, loading: tripsLoading } = useTrips(dataOwnerId, vehicleId);
    const { data: reminders, loading: remindersLoading } = useReminders(dataOwnerId, vehicleId);
    const { data: budgets, loading: budgetsLoading } = useVehicleBudgets(dataOwnerId, vehicleId);
    const localBudget = budgets.find((entry) => entry.vehicle_id === vehicleId);
    const [serverBudget, setServerBudget] = useState<VehicleBudgetRecord | null>(null);
    const [serverBudgetLoading, setServerBudgetLoading] = useState(false);
    const [serverBudgetError, setServerBudgetError] = useState(false);
    const [draft, setDraft] = useState<VehicleBudgetDraft>({
        userId: dataOwnerId,
        vehicleId,
        monthlyBudget: "",
        purchasePrice: "",
        currentValue: "",
        purchaseDate: "",
        annualDepreciationPercent: "15",
    });
    const [busy, setBusy] = useState(false);

    // The provider loads vehicles asynchronously. The state initializer only
    // runs on the first render, so without this reconciliation vehicleId can
    // remain empty and every ownership lookup misses its row.
    useEffect(() => {
        if (!vehicles.length) return;
        if (vehicles.some((vehicle) => vehicle.id === vehicleId)) return;

        const nextVehicleId = vehicles.some((vehicle) => vehicle.id === selectedVehicleId)
            ? selectedVehicleId
            : vehicles[0]?.id ?? "";
        setVehicleId(nextVehicleId);
    }, [selectedVehicleId, vehicleId, vehicles]);

    // PowerSync remains the primary source so this screen works offline. If a
    // row has not reached the local database yet, read the same unique
    // user/vehicle record directly from Supabase instead of showing blank
    // fields and accidentally creating a second budget row.
    useEffect(() => {
        let mounted = true;
        setServerBudget(null);
        setServerBudgetError(false);

        if (!dataOwnerId || !vehicleId || localBudget?.id) {
            setServerBudgetLoading(false);
            return () => { mounted = false; };
        }

        setServerBudgetLoading(true);
        void (async () => {
            try {
                const { data, error } = await supabaseConnector.client
                    .from("vehicle_budgets")
                    .select("*")
                    .eq("user_id", dataOwnerId)
                    .eq("vehicle_id", vehicleId)
                    .order("updated_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (!mounted) return;
                if (error) throw error;
                setServerBudget((data as VehicleBudgetRecord | null) ?? null);
            } catch {
                if (mounted) setServerBudgetError(true);
            } finally {
                if (mounted) setServerBudgetLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [dataOwnerId, localBudget?.id, supabaseConnector, vehicleId]);

    const budget = localBudget ?? serverBudget;

    useEffect(() => {
        if (budget) {
            setDraft({
                id: budget.id ?? undefined,
                userId: dataOwnerId,
                vehicleId,
                monthlyBudget: String(budget.monthly_budget ?? ""),
                purchasePrice: String(budget.purchase_price ?? ""),
                currentValue: String(budget.current_value ?? ""),
                purchaseDate: budget.purchase_date ?? "",
                annualDepreciationPercent: String(budget.annual_depreciation_percent ?? "15"),
            });
            return;
        }
        if (budgetsLoading) return;
        setDraft((current) => current.userId === dataOwnerId && current.vehicleId === vehicleId
            ? current
            : {
                userId: dataOwnerId,
                vehicleId,
                monthlyBudget: "",
                purchasePrice: "",
                currentValue: "",
                purchaseDate: "",
                annualDepreciationPercent: "15",
            });
    }, [budget, budgetsLoading, dataOwnerId, vehicleId]);

    const insights = useMemo(() => {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const currentYear = String(now.getFullYear());
        const previousYear = String(now.getFullYear() - 1);
        const monthlySpend = expenses.filter((entry) => entry.date.startsWith(thisMonth)).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
        const currentYearSpend = expenses.filter((entry) => entry.date.startsWith(currentYear)).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
        const previousYearSpend = expenses.filter((entry) => entry.date.startsWith(previousYear)).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
        const trackedDistance = trips.reduce((sum, trip) => sum + toNumber(trip.distance_km), 0);
        const purchasePrice = toNumber(draft.purchasePrice);
        const annualRate = toNumber(draft.annualDepreciationPercent) / 100;
        const purchaseDate = draft.purchaseDate ? new Date(`${draft.purchaseDate}T12:00:00`) : null;
        const ageYears = purchaseDate && !Number.isNaN(purchaseDate.getTime()) ? Math.max(0, (now.getTime() - purchaseDate.getTime()) / 31_557_600_000) : 0;
        const estimatedValue = purchasePrice > 0 ? purchasePrice * Math.pow(1 - annualRate, ageYears) : 0;
        const currentValue = toNumber(draft.currentValue) || estimatedValue;
        return {
            monthlySpend,
            budgetRemaining: toNumber(draft.monthlyBudget) - monthlySpend,
            costPerKm: trackedDistance > 0 ? expenses.reduce((sum, entry) => sum + toNumber(entry.amount), 0) / trackedDistance : 0,
            yearComparison: previousYearSpend > 0 ? ((currentYearSpend - previousYearSpend) / previousYearSpend) * 100 : null,
            depreciation: purchasePrice > 0 ? Math.max(0, purchasePrice - currentValue) : 0,
            dueSoon: reminders.filter((entry) => entry.status !== "completed" && entry.due_date && new Date(`${entry.due_date}T23:59:59`).getTime() <= now.getTime() + 90 * 86_400_000).length,
        };
    }, [draft.annualDepreciationPercent, draft.currentValue, draft.monthlyBudget, draft.purchaseDate, draft.purchasePrice, expenses, reminders, trips]);

    const save = async () => {
        if (!vehicleId || !canWrite) return;
        setBusy(true);
        try {
            const savedId = await saveVehicleBudget({ ...draft, vehicleId, userId: dataOwnerId });
            setDraft((current) => ({ ...current, id: savedId }));
            Alert.alert(t("ownershipSaved"));
        } catch (error) {
            Alert.alert(t("ownershipCosts"), (error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    if (
        expensesLoading
        || tripsLoading
        || remindersLoading
        || budgetsLoading
        || (!localBudget && serverBudgetLoading)
    ) return <Screen><LoadingState /></Screen>;

    return (
        <Screen>
            <SectionHeader title={t("budgetsOwnership")} />
            {serverBudgetError && !budget ? (
                <Card style={styles.errorCard}>
                    <Text style={styles.errorText}>{t("ownershipRefreshError")}</Text>
                </Card>
            ) : null}
            <Card style={styles.introCard}>
                <Text style={styles.insightTitle}>{t("ownershipMeaning")}</Text>
                <Text style={styles.insightBody}>{t("ownershipMeaningBody")}</Text>
            </Card>
            <VehicleSelectField vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />
            <View style={styles.grid}>
                <MetricCard label={t("spentThisMonth")} value={formatCurrency(insights.monthlySpend)} icon="wallet-outline" />
                <MetricCard label={t("budgetRemaining")} value={draft.monthlyBudget.trim() ? formatCurrency(insights.budgetRemaining) : t("notSet")} icon="speedometer-outline" tone={insights.budgetRemaining < 0 ? "red" : "green"} />
                <MetricCard label={t("costPerTrackedKm")} value={insights.costPerKm ? formatCurrency(insights.costPerKm) : "—"} icon="analytics-outline" tone="amber" />
                <MetricCard label={t("estimatedDepreciation")} value={insights.depreciation ? formatCurrency(insights.depreciation) : "—"} icon="trending-down-outline" tone="amber" />
            </View>
            <Card style={styles.insightCard}>
                <Text style={styles.insightTitle}>{t("yearOverYear")}</Text>
                <Text style={styles.insightValue}>{insights.yearComparison === null ? t("addLastYearExpenses") : t("comparedWithLastYear", { percent: `${insights.yearComparison >= 0 ? "+" : ""}${insights.yearComparison.toFixed(1)}` })}</Text>
                <Text style={styles.insightBody}>{t("upcomingRemindersSummary", { count: insights.dueSoon })}</Text>
                <Text style={styles.insightBody}>{t("trackedTripCostSummary", { distance: formatDistance(trips.reduce((sum, trip) => sum + toNumber(trip.distance_km), 0)) })}</Text>
            </Card>
            <SectionHeader title={t("ownershipAssumptions")} />
            <Card style={styles.form}>
                <FormField label={t("monthlyBudget")} value={draft.monthlyBudget} onChangeText={(value) => setDraft((current) => ({ ...current, monthlyBudget: value }))} keyboardType="decimal-pad" />
                <FormField label={t("purchasePrice")} value={draft.purchasePrice} onChangeText={(value) => setDraft((current) => ({ ...current, purchasePrice: value }))} keyboardType="decimal-pad" />
                <FormField label={t("currentValue")} value={draft.currentValue} onChangeText={(value) => setDraft((current) => ({ ...current, currentValue: value }))} keyboardType="decimal-pad" hint={t("currentValueHint")} />
                <DateField label={t("purchaseDate")} value={draft.purchaseDate} onChange={(value) => setDraft((current) => ({ ...current, purchaseDate: value }))} />
                <FormField label={t("annualDepreciation")} value={draft.annualDepreciationPercent} onChangeText={(value) => setDraft((current) => ({ ...current, annualDepreciationPercent: value }))} keyboardType="decimal-pad" />
            </Card>
            <Button label={t("saveOwnershipSettings")} icon="checkmark" onPress={() => void save()} loading={busy} disabled={!vehicleId || !canWrite} />
        </Screen>
    );
}

const styles = StyleSheet.create({
    grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    errorCard: { backgroundColor: colors.dangerSoft },
    errorText: { ...typography.caption, color: colors.danger },
    introCard: { gap: spacing.sm, backgroundColor: colors.primarySoft },
    insightCard: { gap: spacing.sm },
    insightTitle: { ...typography.heading, color: colors.ink },
    insightValue: { ...typography.bodyStrong, color: colors.primary },
    insightBody: { ...typography.caption, color: colors.inkMuted },
    form: { gap: spacing.lg },
});
