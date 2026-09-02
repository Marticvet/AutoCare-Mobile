import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Card, DateField, FormField, MetricCard, Screen, SectionHeader } from "../../components/ui";
import { VehicleSelectField } from "../../components/VehicleSelectField";
import { useExpenses, useReminders, useTrips, useVehicleBudgets } from "../../data/liveQueries";
import { VehicleBudgetDraft } from "../../data/models";
import { saveVehicleBudget } from "../../data/repository";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { useGarage } from "../../providers/GarageProvider";
import { colors, spacing, typography } from "../../theme/tokens";
import { toNumber } from "../../utils/tracking";

export default function OwnershipScreen() {
    const { vehicles, selectedVehicleId, dataOwnerId, canWrite } = useGarage();
    const { formatCurrency, formatDistance } = usePreferences();
    const [vehicleId, setVehicleId] = useState(selectedVehicleId || vehicles[0]?.id || "");
    const { data: expenses } = useExpenses(dataOwnerId, vehicleId);
    const { data: trips } = useTrips(dataOwnerId, vehicleId);
    const { data: reminders } = useReminders(dataOwnerId, vehicleId);
    const { data: budgets } = useVehicleBudgets(dataOwnerId, vehicleId);
    const budget = budgets[0];
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

    useEffect(() => {
        setDraft({
            id: budget?.id ?? undefined,
            userId: dataOwnerId,
            vehicleId,
            monthlyBudget: String(budget?.monthly_budget ?? ""),
            purchasePrice: String(budget?.purchase_price ?? ""),
            currentValue: String(budget?.current_value ?? ""),
            purchaseDate: budget?.purchase_date ?? "",
            annualDepreciationPercent: String(budget?.annual_depreciation_percent ?? "15"),
        });
    }, [budget, dataOwnerId, vehicleId]);

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
            await saveVehicleBudget({ ...draft, vehicleId, userId: dataOwnerId });
            Alert.alert("Ownership settings saved");
        } catch (error) {
            Alert.alert("Ownership costs", (error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Screen>
            <SectionHeader title="Budgets & ownership cost" />
            <VehicleSelectField vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />
            <View style={styles.grid}>
                <MetricCard label="Spent this month" value={formatCurrency(insights.monthlySpend)} icon="wallet-outline" />
                <MetricCard label="Budget remaining" value={formatCurrency(insights.budgetRemaining)} icon="speedometer-outline" tone={insights.budgetRemaining < 0 ? "red" : "green"} />
                <MetricCard label="Cost per tracked km" value={insights.costPerKm ? formatCurrency(insights.costPerKm) : "—"} icon="analytics-outline" tone="amber" />
                <MetricCard label="Estimated depreciation" value={insights.depreciation ? formatCurrency(insights.depreciation) : "—"} icon="trending-down-outline" tone="amber" />
            </View>
            <Card style={styles.insightCard}>
                <Text style={styles.insightTitle}>Year-over-year</Text>
                <Text style={styles.insightValue}>{insights.yearComparison === null ? "Add last year’s expenses to compare" : `${insights.yearComparison >= 0 ? "+" : ""}${insights.yearComparison.toFixed(1)}% vs last year`}</Text>
                <Text style={styles.insightBody}>{insights.dueSoon} upcoming reminder{insights.dueSoon === 1 ? "" : "s"} in the next 90 days. Expected cost appears once you record it as an expense.</Text>
                <Text style={styles.insightBody}>Cost/km uses {formatDistance(trips.reduce((sum, trip) => sum + toNumber(trip.distance_km), 0))} of tracked trips.</Text>
            </Card>
            <SectionHeader title="Ownership assumptions" />
            <Card style={styles.form}>
                <FormField label="Monthly budget" value={draft.monthlyBudget} onChangeText={(value) => setDraft((current) => ({ ...current, monthlyBudget: value }))} keyboardType="decimal-pad" />
                <FormField label="Purchase price" value={draft.purchasePrice} onChangeText={(value) => setDraft((current) => ({ ...current, purchasePrice: value }))} keyboardType="decimal-pad" />
                <FormField label="Current value" value={draft.currentValue} onChangeText={(value) => setDraft((current) => ({ ...current, currentValue: value }))} keyboardType="decimal-pad" hint="Leave empty to estimate from the annual depreciation rate." />
                <DateField label="Purchase date" value={draft.purchaseDate} onChange={(value) => setDraft((current) => ({ ...current, purchaseDate: value }))} />
                <FormField label="Annual depreciation (%)" value={draft.annualDepreciationPercent} onChangeText={(value) => setDraft((current) => ({ ...current, annualDepreciationPercent: value }))} keyboardType="decimal-pad" />
            </Card>
            <Button label="Save ownership settings" icon="checkmark" onPress={() => void save()} loading={busy} disabled={!vehicleId || !canWrite} />
        </Screen>
    );
}

const styles = StyleSheet.create({
    grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    insightCard: { gap: spacing.sm },
    insightTitle: { ...typography.heading, color: colors.ink },
    insightValue: { ...typography.bodyStrong, color: colors.primary },
    insightBody: { ...typography.caption, color: colors.inkMuted },
    form: { gap: spacing.lg },
});
