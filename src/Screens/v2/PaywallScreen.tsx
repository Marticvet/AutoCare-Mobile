import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { Button, Card, Screen } from "../../components/ui";
import { ENTITLEMENTS } from "../../billing/entitlements";
import { annualSavingsPercent } from "../../billing/pricing";
import { useSubscription } from "../../billing/SubscriptionProvider";
import { RootStackParamList } from "../../navigation/types";
import { colors, radius, spacing, typography } from "../../theme/tokens";
import { usePreferences } from "../../i18n/PreferencesProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Paywall">;

export default function PaywallScreen({ navigation, route }: Props) {
    const { t } = usePreferences();
    const {
        configured,
        billingDisabled,
        currentOffering,
        error,
        hasPlus,
        hasFamily,
        loading,
        purchasing,
        purchase,
        restorePurchases,
        clearError,
    } = useSubscription();
    const [plan, setPlan] = useState<"plus" | "family">(route.params?.source === "family" ? "family" : "plus");
    const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
    const familyMode = plan === "family";
    const planLabel = familyMode ? t("family") : "Plus";
    const benefits = [
        ["car-sport-outline", t("moreThanOneVehicle"), t("moreVehiclesBody")],
        ["documents-outline", t("documentsUploads"), t("documentsUploadsBody")],
        ["analytics-outline", t("reportsAdvancedInsights"), t("reportsAdvancedInsightsBody")],
        ["repeat-outline", t("recurringReminders"), t("recurringRemindersBenefitBody")],
    ] as const;
    const familyBenefits = [
        ["people-outline", t("upToSixPeople"), t("upToSixPeopleBody")],
        ["swap-horizontal-outline", t("sharedGarage"), t("sharedGarageBody")],
        ["shield-checkmark-outline", t("rolesPermissions"), t("rolesPermissionsBody")],
        ["sparkles-outline", t("everythingInPlus"), t("everythingInPlusBody")],
    ] as const;
    const packages = useMemo(() => {
        const available = currentOffering?.availablePackages ?? [];
        return available.filter((item) => familyMode ? isFamilyPackage(item) : !isFamilyPackage(item));
    }, [currentOffering, familyMode]);
    const annualSavings = useMemo(() => annualSavingsPercent(packages), [packages]);
    const [selected, setSelected] = useState<PurchasesPackage | null>(null);

    useEffect(() => {
        const matching = packages.find((item) => {
            const identity = `${item.packageType} ${item.identifier} ${item.product.identifier}`;
            return billingPeriod === "yearly" ? /annual|year/i.test(identity) : /month/i.test(identity);
        }) ?? null;
        setSelected(matching);
    }, [billingPeriod, packages]);

    const sourceMessage = useMemo(
        () =>
            ((
                {
                    vehicle: t("secondVehiclePlus"),
                    document: t("documentStoragePlus"),
                    export: t("csvReportsPlus"),
                    reminder: t("recurringIncludedPlus"),
                    insights: t("insightsIncludedPlus"),
                    family: t("shareSixFamily"),
                } as Record<string, string>
            )[route.params?.source ?? ""] ??
            t("unlockPlus")),
        [route.params?.source, t]
    );

    const buy = async () => {
        if (!selected) return;
        clearError();
        if (await purchase(selected, familyMode ? ENTITLEMENTS.sharedGarage : ENTITLEMENTS.plusFeatures)) {
            Alert.alert(`AutoCare ${planLabel}`, t("planActiveBody", { plan: planLabel }), [
                { text: t("continue"), onPress: navigation.goBack },
            ]);
        }
    };

    const restore = async () => {
        clearError();
        const restoredCustomerInfo = await restorePurchases();
        const restored = Boolean(restoredCustomerInfo?.entitlements.active[
            familyMode ? ENTITLEMENTS.sharedGarage : ENTITLEMENTS.plusFeatures
        ]);
        Alert.alert(
            t("restorePurchases"),
            restored
                ? t("purchaseRestored", { plan: planLabel })
                : t("noActivePlanPurchase", { plan: planLabel })
        );
        if (restored) navigation.goBack();
    };

    const targetActive = familyMode ? hasFamily : hasPlus;

    if (billingDisabled) {
        return (
            <Screen contentStyle={styles.centered}>
                <View style={styles.heroMark}>
                    <Ionicons name="information-circle-outline" color={colors.white} size={28} />
                </View>
                <Text style={styles.hero}>{t("purchasesUnavailableTitle")}</Text>
                <Text style={styles.subtitle}>{t("purchasesUnavailableBody")}</Text>
                <Button label={t("continue")} icon="arrow-back" onPress={navigation.goBack} />
            </Screen>
        );
    }

    return (
        <Screen>
            <View style={styles.heroMark}>
                <Ionicons name="sparkles" color={colors.white} size={28} />
            </View>
            <Text style={styles.eyebrow}>{`AUTOCARE ${planLabel.toLocaleUpperCase()}`}</Text>
            <Text style={styles.hero}>{familyMode ? t("familyHero") : t("plusHero")}</Text>
            <Text style={styles.subtitle}>{sourceMessage}</Text>

            <View style={styles.comparison}>
                <PlanCard title={t("free")} body={t("coreTrackingOneVehicle")} current={!hasPlus} />
                <PlanCard title="AutoCare Plus" body={t("moreVehiclesBody")} current={hasPlus && !hasFamily} selected={plan === "plus"} onPress={() => setPlan("plus")} />
                <PlanCard title="AutoCare Family" body={t("sharedGarageBody")} current={hasFamily} selected={plan === "family"} onPress={() => setPlan("family")} />
            </View>

            <View style={styles.periodSelector} accessibilityRole="radiogroup">
                {(["monthly", "yearly"] as const).map((period) => (
                    <Pressable
                        key={period}
                        onPress={() => setBillingPeriod(period)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: billingPeriod === period }}
                        style={[styles.periodOption, billingPeriod === period && styles.periodOptionActive]}
                    >
                        <Text style={[styles.periodText, billingPeriod === period && styles.periodTextActive]}>
                            {period === "yearly" && annualSavings ? `${t(period)} · ${t("savePercent", { percent: annualSavings })}` : t(period)}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <View style={styles.benefits}>
                {(familyMode ? familyBenefits : benefits).map(([icon, title, body]) => (
                    <View key={title} style={styles.benefit}>
                        <View style={styles.benefitIcon}>
                            <Ionicons
                                name={icon}
                                color={colors.primary}
                                size={21}
                            />
                        </View>
                        <View style={styles.benefitCopy}>
                            <Text style={styles.benefitTitle}>{title}</Text>
                            <Text style={styles.benefitBody}>{body}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {error ? (
                <View style={styles.error}>
                    <Ionicons
                        name="alert-circle-outline"
                        color={colors.danger}
                        size={20}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

            {!loading && !configured ? (
                <Card style={styles.notice}>
                    <Text style={styles.noticeTitle}>
                        {t("billingSetupRequired")}
                    </Text>
                    <Text style={styles.noticeBody}>
                        {t("billingSetupBody")}
                    </Text>
                </Card>
            ) : null}

            <View style={styles.packages}>
                {selected ? (
                        <View style={[styles.package, styles.packageActive]}>
                            <View
                                style={[styles.radio, styles.radioActive]}
                            >
                                <View style={styles.radioDot} />
                            </View>
                            <View style={styles.packageCopy}>
                                <Text style={styles.packageTitle}>
                                    {packageLabel(selected, t)}
                                </Text>
                                <Text
                                    style={styles.packageDescription}
                                    numberOfLines={2}
                                >
                                    {selected.product.description || selected.product.title}
                                </Text>
                            </View>
                            <View style={styles.price}>
                                <Text style={styles.priceValue}>
                                    {selected.product.priceString}
                                </Text>
                                <Text style={styles.pricePeriod}>
                                    {periodLabel(selected, t)}
                                </Text>
                            </View>
                        </View>
                ) : null}
            </View>

            {!loading && configured && !selected ? (
                <Card style={styles.notice}>
                    <Text style={styles.noticeTitle}>
                        {t("noOfferingAvailable")}
                    </Text>
                    <Text style={styles.noticeBody}>
                        {t("noOfferingBody", { plan: planLabel })}
                    </Text>
                </Card>
            ) : null}

            <Button
                label={
                    targetActive
                        ? t("currentPlan")
                        : selected
                        ? t("continueWithPrice", { price: selected.product.priceString })
                        : t("choosePlan")
                }
                icon="lock-open-outline"
                loading={purchasing}
                disabled={targetActive || !selected || !configured}
                onPress={() => void buy()}
            />
            <Button
                label={t("restorePurchases")}
                variant="ghost"
                loading={purchasing}
                onPress={() => void restore()}
            />
            <Text style={styles.finePrint}>
                {t("paymentFinePrint")}
            </Text>
            <Text style={styles.finePrint}>{t("subscriptionCancellationNotice")}</Text>
            <View style={styles.legalLinks}>
                <Pressable accessibilityRole="link" onPress={() => void openLegalLink(process.env.EXPO_PUBLIC_TERMS_URL, t("termsOfService"), t)} hitSlop={8}>
                    <Text style={styles.legalLink}>{t("termsOfService")}</Text>
                </Pressable>
                <Text style={styles.legalSeparator}>·</Text>
                <Pressable accessibilityRole="link" onPress={() => void openLegalLink(process.env.EXPO_PUBLIC_PRIVACY_URL, t("privacyPolicy"), t)} hitSlop={8}>
                    <Text style={styles.legalLink}>{t("privacyPolicy")}</Text>
                </Pressable>
            </View>
        </Screen>
    );
}

type Translate = ReturnType<typeof usePreferences>["t"];

function PlanCard({ title, body, current = false, selected = false, onPress }: { title: string; body: string; current?: boolean; selected?: boolean; onPress?: () => void }) {
    return (
        <Pressable
            disabled={!onPress}
            onPress={onPress}
            accessibilityRole={onPress ? "radio" : undefined}
            accessibilityState={onPress ? { checked: selected } : undefined}
            style={[styles.planCard, selected && styles.planCardSelected]}
        >
            <View style={styles.planCardHeader}>
                <Text style={styles.planCardTitle}>{title}</Text>
                {current ? <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>✓</Text></View> : null}
            </View>
            <Text style={styles.planCardBody}>{body}</Text>
        </Pressable>
    );
}

async function openLegalLink(url: string | undefined, title: string, t: Translate) {
    if (!url) return Alert.alert(title, t("configureUrl"));
    if (!(await Linking.canOpenURL(url))) return Alert.alert(title, t("linkOpenFailed"));
    await Linking.openURL(url);
}

function packageLabel(item: PurchasesPackage, t: Translate) {
    const identity = `${item.identifier} ${item.product.identifier}`;
    if (item.packageType === "ANNUAL" || /annual|year/i.test(identity)) return t("yearly");
    if (item.packageType === "MONTHLY" || /month/i.test(identity)) return t("monthly");
    return item.product.title || item.identifier;
}

function isFamilyPackage(item: PurchasesPackage) {
    return /family/i.test([
        item.identifier,
        item.product.identifier,
        item.product.title,
    ].join(" "));
}

function periodLabel(item: PurchasesPackage, t: Translate) {
    const identity = `${item.identifier} ${item.product.identifier}`;
    if (item.packageType === "ANNUAL" || /annual|year/i.test(identity)) return t("perYear");
    if (item.packageType === "MONTHLY" || /month/i.test(identity)) return t("perMonth");
    return "";
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: "center", gap: spacing.xl },
    successIcon: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: colors.success,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
    },
    heroMark: {
        width: 58,
        height: 58,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.lg,
    },
    eyebrow: { ...typography.label, color: colors.primary, letterSpacing: 1.6 },
    hero: { ...typography.hero, color: colors.ink, marginTop: spacing.sm },
    subtitle: {
        ...typography.body,
        color: colors.inkMuted,
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
    },
    benefits: { gap: spacing.md, marginBottom: spacing.xl },
    comparison: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
    planCard: { flexGrow: 1, flexBasis: 155, minHeight: 112, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm },
    planCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft, borderWidth: 2 },
    planCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
    planCardTitle: { ...typography.bodyStrong, color: colors.ink, flex: 1 },
    planCardBody: { ...typography.caption, color: colors.inkMuted },
    currentBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.successSoft },
    currentBadgeText: { ...typography.label, color: colors.success },
    periodSelector: { flexDirection: "row", borderRadius: radius.lg, backgroundColor: colors.primarySoft, padding: spacing.xs, marginBottom: spacing.lg },
    periodOption: { flex: 1, minHeight: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
    periodOptionActive: { backgroundColor: colors.surface },
    periodText: { ...typography.bodyStrong, color: colors.inkMuted },
    periodTextActive: { color: colors.primary },
    benefit: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    benefitIcon: {
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: colors.primarySoft,
        alignItems: "center",
        justifyContent: "center",
    },
    benefitCopy: { flex: 1, minWidth: 0 },
    benefitTitle: { ...typography.bodyStrong, color: colors.ink },
    benefitBody: { ...typography.caption, color: colors.inkMuted },
    error: {
        borderRadius: radius.md,
        backgroundColor: colors.dangerSoft,
        padding: spacing.md,
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    errorText: { ...typography.caption, color: colors.danger, flex: 1 },
    notice: {
        backgroundColor: colors.warningSoft,
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    noticeTitle: { ...typography.bodyStrong, color: colors.ink },
    noticeBody: { ...typography.caption, color: colors.inkMuted },
    packages: { gap: spacing.sm, marginBottom: spacing.lg },
    package: {
        minHeight: 84,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },
    packageActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primarySoft,
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.borderStrong,
        alignItems: "center",
        justifyContent: "center",
    },
    radioActive: { borderColor: colors.primary },
    radioDot: {
        width: 11,
        height: 11,
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
    packageCopy: { flexGrow: 1, flexBasis: 160, minWidth: 0 },
    packageTitle: { ...typography.bodyStrong, color: colors.ink },
    packageDescription: {
        ...typography.caption,
        color: colors.inkMuted,
        marginTop: 2,
    },
    price: { alignItems: "flex-end", flexShrink: 0 },
    priceValue: { ...typography.bodyStrong, color: colors.ink },
    pricePeriod: { ...typography.caption, color: colors.inkMuted },
    finePrint: {
        ...typography.caption,
        color: colors.inkMuted,
        textAlign: "center",
        marginTop: spacing.md,
    },
    legalLinks: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.lg },
    legalLink: { ...typography.label, color: colors.primary, textDecorationLine: "underline" },
    legalSeparator: { ...typography.caption, color: colors.inkMuted },
});
