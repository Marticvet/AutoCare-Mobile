import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop, Text as SvgText } from "react-native-svg";
import { Button, Card, DateField, EmptyState, LoadingState, PageHeader, Row, Screen, SectionHeader, SelectField } from "../../components/ui";
import { VehicleSelectField } from "../../components/VehicleSelectField";
import { useExpenses } from "../../data/liveQueries";
import { ExpenseCategory } from "../../data/models";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useGarage } from "../../providers/GarageProvider";
import { exportExpensesCsv } from "../../services/reportExport";
import { colors, spacing, typography } from "../../theme/tokens";
import { ExpensePeriod, estimateFuelCo2Kg, expenseDateRangeForPeriod, expenseTrendTotals, filterExpensesByRange, groupExpenseTotals, totalExpenses } from "../../utils/tracking";
import { useSubscription } from "../../billing/SubscriptionProvider";

export default function ExpensesScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t, currency, locale, formatCurrency } = usePreferences();
    const { vehicles, selectedVehicleId, dataOwnerId } = useGarage();
    const { canExportReports, canUseAdvancedInsights } = useSubscription();
    const [scope, setScope] = useState(selectedVehicleId || "all");
    const [period, setPeriod] = useState<ExpensePeriod>("month");
    const [category, setCategory] = useState<ExpenseCategory | "all">("all");
    const initialCustomRange = expenseDateRangeForPeriod("month");
    const [customStart, setCustomStart] = useState(initialCustomRange.start ?? initialCustomRange.end);
    const [customEnd, setCustomEnd] = useState(initialCustomRange.end);
    const vehicleId = scope === "all" ? undefined : scope;
    const { data: allExpenses, loading } = useExpenses(dataOwnerId, vehicleId);
    const activeRange = useMemo(
        () => period === "custom"
            ? { start: customStart || null, end: customEnd }
            : expenseDateRangeForPeriod(period),
        [customEnd, customStart, period]
    );
    const categoryExpenses = useMemo(
        () => allExpenses.filter((expense) => category === "all" || expense.category === category),
        [allExpenses, category]
    );
    const expenses = useMemo(
        () => filterExpensesByRange(categoryExpenses, activeRange.start, activeRange.end),
        [activeRange.end, activeRange.start, categoryExpenses]
    );
    const totals = useMemo(() => groupExpenseTotals(expenses), [expenses]);
    const trend = useMemo(
        () => expenseTrendTotals(expenses, activeRange.start, activeRange.end),
        [activeRange.end, activeRange.start, expenses]
    );
    const dayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }), [locale]);
    const monthFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" }), [locale]);
    const trendData = useMemo(() => trend.map((entry) => ({
        label: formatTrendLabel(entry.start, entry.end, dayFormatter, monthFormatter),
        value: entry.total,
    })), [dayFormatter, monthFormatter, trend]);

    const exportReport = async () => {
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

    if (loading) return <Screen><LoadingState /></Screen>;

    return (
        <Screen>
            <PageHeader title={t("expenses")} action={t("addExpense")} onAction={() => navigation.navigate("ExpenseForm", { vehicleId })} />

            <View style={styles.filters}>
                <VehicleSelectField
                    vehicles={vehicles}
                    value={scope}
                    onChange={setScope}
                    includeAll
                />
                <SelectField<ExpensePeriod>
                    label={t("dateRange")}
                    value={period}
                    onChange={(value) => {
                        if (!canUseAdvancedInsights && value !== "month") navigation.navigate("Paywall", { source: "insights" });
                        else setPeriod(value);
                    }}
                    options={[
                        { value: "week", label: t("periodWeek") },
                        { value: "month", label: t("periodMonth") },
                        { value: "year", label: t("periodYear") },
                        { value: "all", label: t("periodAll") },
                        { value: "custom", label: t("periodCustom") },
                    ]}
                />
                {period === "custom" ? (
                    <View style={styles.dateColumns}>
                        <View style={styles.dateColumn}>
                            <DateField
                                label={t("startDate")}
                                value={customStart}
                                maxDate={customEnd}
                                onChange={(value) => setCustomStart(value)}
                                required
                            />
                        </View>
                        <View style={styles.dateColumn}>
                            <DateField
                                label={t("endDate")}
                                value={customEnd}
                                minDate={customStart}
                                onChange={(value) => setCustomEnd(value)}
                                required
                            />
                        </View>
                    </View>
                ) : null}
                <SelectField<ExpenseCategory | "all">
                    label={t("expenseType")}
                    value={category}
                    onChange={(value) => {
                        if (!canUseAdvancedInsights && value !== "all") navigation.navigate("Paywall", { source: "insights" });
                        else setCategory(value);
                    }}
                    options={(["all", "fuel", "charging", "service", "insurance", "parking", "toll", "tax", "wash", "repair", "other"] as const).map((value) => ({ value, label: value === "all" ? t("all") : t(value) }))}
                />
            </View>

            <Card style={styles.summary}>
                <View style={styles.summaryTop}>
                    <View style={styles.summaryCopy}>
                        <Text style={styles.summaryLabel}>{t("totalSpend")}</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(totalExpenses(expenses))}</Text>
                    </View>
                    <View style={styles.exportButton}>
                        <Button label={canExportReports ? t("exportCsv") : t("plusExport")} icon={canExportReports ? "share-outline" : "lock-closed-outline"} variant="secondary" compact onPress={exportReport} disabled={!expenses.length} />
                    </View>
                </View>
                <View style={styles.emissionsRow}>
                    <Text style={styles.emissionsLabel}>{t("estimatedEmissions")}</Text>
                    <Text style={styles.emissionsValue} numberOfLines={1}>{estimateFuelCo2Kg(expenses).toFixed(1)} kg CO₂</Text>
                </View>
            </Card>

            {expenses.length ? (
                <>
                    <View style={styles.section}>
                        <SectionHeader title={t("spendingTrend")} />
                        {canUseAdvancedInsights ? (
                            <Card>
                                <TrendChart
                                    data={trendData}
                                    formatCurrency={formatCurrency}
                                />
                            </Card>
                        ) : (
                            <Card style={styles.plusGate}>
                                <Text style={styles.plusGateTitle}>{t("advancedInsightsPlus")}</Text>
                                <Text style={styles.plusGateBody}>{t("advancedInsightsBody")}</Text>
                                <Button label={t("explorePlus")} icon="sparkles-outline" variant="secondary" onPress={() => navigation.navigate("Paywall", { source: "insights" })} />
                            </Card>
                        )}
                    </View>
                    <View style={styles.section}>
                        <SectionHeader title={t("costByCategory")} />
                        <Card style={styles.categories}>
                            {Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([key, value]) => (
                                <View key={key} style={styles.categoryRow}>
                                    <Text style={styles.categoryName}>{t(key as ExpenseCategory)}</Text>
                                    <Text style={styles.categoryAmount}>{formatCurrency(value)}</Text>
                                </View>
                            ))}
                        </Card>
                    </View>
                    <View style={styles.section}>
                        <SectionHeader title={t("recentExpenses")} />
                        <Card style={styles.list}>
                            {expenses.map((expense, index) => (
                                <View key={`${expense.source}-${expense.id}`}>
                                    <Row
                                        icon={expenseIcon(expense.category)}
                                        title={expense.title}
                                        subtitle={`${expense.date} · ${vehicles.find((vehicle) => vehicle.id === expense.vehicle_id)?.vehicle_license_plate || t("vehicle")}`}
                                        trailing={<Text style={styles.rowAmount}>{formatCurrency(expense.amount)}</Text>}
                                        onPress={() => navigation.navigate("ExpenseForm", { expenseId: expense.id, source: expense.source })}
                                    />
                                    {index < expenses.length - 1 ? <View style={styles.divider} /> : null}
                                </View>
                            ))}
                        </Card>
                    </View>
                </>
            ) : (
                <EmptyState icon="receipt-outline" title={t("noExpenses")} body={t("noExpensesBody")} action={t("addExpense")} onAction={() => navigation.navigate("ExpenseForm", { vehicleId })} />
            )}
        </Screen>
    );
}

function TrendChart({ data, formatCurrency }: { data: { label: string; value: number }[]; formatCurrency: (value: number) => string }) {
    const { t } = usePreferences();
    const [width, setWidth] = useState(0);
    const rawMax = Math.max(...data.map((entry) => entry.value), 0);
    const max = rawMax || 1;
    const chartHeight = 206;
    const plot = { left: 48, right: 12, top: 26, bottom: 32 };
    const baseline = chartHeight - plot.bottom;
    const plotWidth = Math.max(width - plot.left - plot.right, 1);
    const plotHeight = baseline - plot.top;
    const points = data.map((entry, index) => ({
        ...entry,
        x: plot.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth),
        y: baseline - (entry.value / max) * plotHeight,
    }));
    const linePath = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
    const areaPath = points.length ? `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z` : "";
    const average = data.reduce((sum, entry) => sum + entry.value, 0) / Math.max(data.length, 1);
    const highest = data.reduce((peak, entry) => entry.value > peak.value ? entry : peak, data[0] ?? { label: "—", value: 0 });
    const labelStep = Math.max(1, Math.ceil(data.length / 6));

    return (
        <View style={styles.trend}>
            <View style={styles.chart} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
                {width ? (
                    <Svg width={width} height={chartHeight} accessibilityLabel={t("spendingTrend")}>
                        <Defs>
                            <LinearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={colors.primary} stopOpacity="0.26" />
                                <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
                            </LinearGradient>
                        </Defs>
                        {[0, 0.5, 1].map((ratio) => {
                            const y = plot.top + ratio * plotHeight;
                            const value = max * (1 - ratio);
                            return (
                                <React.Fragment key={ratio}>
                                    <Line x1={plot.left} y1={y} x2={width - plot.right} y2={y} stroke={colors.border} strokeDasharray="4 5" strokeWidth={1} />
                                    <SvgText x={plot.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill={colors.inkMuted}>{compactValue(value)}</SvgText>
                                </React.Fragment>
                            );
                        })}
                        {areaPath ? <Path d={areaPath} fill="url(#trendArea)" /> : null}
                        {linePath ? <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
                        {points.map((point, index) => (
                            <React.Fragment key={point.label}>
                                <Circle cx={point.x} cy={point.y} r={data.length > 20 ? 3 : 5} fill={colors.surface} stroke={colors.primary} strokeWidth={data.length > 20 ? 2 : 3} />
                                {point.value > 0 && (data.length <= 12 || point.value === rawMax) ? <SvgText x={point.x} y={Math.max(point.y - 10, 12)} textAnchor="middle" fontSize="10" fontWeight="700" fill={colors.ink}>{compactValue(point.value)}</SvgText> : null}
                                {index % labelStep === 0 || index === points.length - 1 ? <SvgText x={point.x} y={chartHeight - 8} textAnchor="middle" fontSize="11" fill={colors.inkMuted}>{point.label}</SvgText> : null}
                            </React.Fragment>
                        ))}
                    </Svg>
                ) : null}
            </View>
            <View style={styles.trendStats}>
                <TrendMetric label={t("selectedPeriod")} value={formatCurrency(data.reduce((sum, entry) => sum + entry.value, 0))} />
                <TrendMetric label={t("averageInterval")} value={formatCurrency(average)} />
                <TrendMetric label={`${t("highestInterval")} · ${highest.label}`} value={formatCurrency(highest.value)} />
            </View>
        </View>
    );
}

function formatTrendLabel(
    start: string,
    end: string,
    dayFormatter: Intl.DateTimeFormat,
    monthFormatter: Intl.DateTimeFormat
) {
    const startDate = new Date(`${start}T12:00:00`);
    const endDate = new Date(`${end}T12:00:00`);
    if (start === end) return dayFormatter.format(startDate);
    const duration = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    if (duration <= 7) return `${dayFormatter.format(startDate)}–${dayFormatter.format(endDate)}`;
    return monthFormatter.format(startDate);
}

function TrendMetric({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.trendMetric}>
            <Text numberOfLines={1} style={styles.trendMetricLabel}>{label}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.trendMetricValue}>{value}</Text>
        </View>
    );
}

const compactValue = (value: number) => value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`
    : value >= 1_000
        ? `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`
        : String(Math.round(value));

const expenseIcon = (category: ExpenseCategory) => ({ fuel: "water-outline", charging: "flash-outline", service: "construct-outline", insurance: "shield-checkmark-outline", parking: "car-outline", toll: "trail-sign-outline", tax: "document-text-outline", wash: "sparkles-outline", repair: "hammer-outline", other: "receipt-outline" }[category]);

const styles = StyleSheet.create({
    filters: { gap: spacing.md },
    dateColumns: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    dateColumn: { flexGrow: 1, flexBasis: 210, minWidth: 0 },
    summary: { backgroundColor: colors.ink, gap: spacing.md },
    summaryTop: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.lg },
    summaryCopy: { flex: 1, minWidth: 0 },
    exportButton: { flexShrink: 0, marginRight: spacing.sm },
    summaryLabel: { ...typography.caption, color: "rgba(255,255,255,0.68)" },
    summaryValue: { ...typography.title, color: colors.white },
    emissionsRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: spacing.md },
    emissionsLabel: { ...typography.caption, color: "rgba(255,255,255,0.68)", flex: 1 },
    emissionsValue: { ...typography.caption, color: "rgba(255,255,255,0.82)", textAlign: "right", flexShrink: 0 },
    section: { gap: spacing.md },
    plusGate: { gap: spacing.sm, backgroundColor: colors.primarySoft },
    plusGateTitle: { ...typography.bodyStrong, color: colors.ink },
    plusGateBody: { ...typography.body, color: colors.inkMuted, marginBottom: spacing.xs },
    trend: { gap: spacing.md },
    chart: { width: "100%", height: 206 },
    trendStats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    trendMetric: { flexGrow: 1, flexBasis: 110, minWidth: 0, padding: spacing.sm, borderRadius: 12, backgroundColor: colors.canvas, gap: 3 },
    trendMetricLabel: { ...typography.caption, fontSize: 10, color: colors.inkMuted },
    trendMetricValue: { ...typography.label, color: colors.ink },
    categories: { gap: spacing.md },
    categoryRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.lg },
    categoryName: { ...typography.body, color: colors.ink, textTransform: "capitalize", flex: 1, minWidth: 0 },
    categoryAmount: { ...typography.bodyStrong, color: colors.ink, flexShrink: 0 },
    list: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
    rowAmount: { ...typography.bodyStrong, color: colors.ink },
});
