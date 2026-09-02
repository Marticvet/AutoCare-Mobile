import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { Button, Card, Screen } from "../../components/ui";
import { ENTITLEMENTS } from "../../billing/entitlements";
import { useSubscription } from "../../billing/SubscriptionProvider";
import { RootStackParamList } from "../../navigation/types";
import { colors, radius, spacing, typography } from "../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Paywall">;

const benefits = [
    [
        "car-sport-outline",
        "More than one vehicle",
        "Track a household or growing garage.",
    ],
    [
        "documents-outline",
        "Documents and uploads",
        "Keep important vehicle files organized.",
    ],
    [
        "analytics-outline",
        "Reports and advanced insights",
        "Export data and explore deeper trends.",
    ],
    [
        "repeat-outline",
        "Recurring reminders",
        "Automate repeating maintenance schedules.",
    ],
] as const;

const familyBenefits = [
    ["people-outline", "Up to six people", "Invite family members, drivers, or a trusted viewer."],
    ["swap-horizontal-outline", "Shared garage", "Everyone sees the same vehicles, expenses, documents, and reminders."],
    ["shield-checkmark-outline", "Roles and permissions", "Choose admin, driver, or view-only access."],
    ["sparkles-outline", "Everything in Plus", "Unlimited vehicles, documents, exports, insights, and recurring reminders."],
] as const;

export default function PaywallScreen({ navigation, route }: Props) {
    const {
        configured,
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
    const familyMode = route.params?.source === "family";
    const packages = useMemo(() => {
        const available = currentOffering?.availablePackages ?? [];
        return available.filter((item) => familyMode ? isFamilyPackage(item) : !isFamilyPackage(item));
    }, [currentOffering, familyMode]);
    const [selected, setSelected] = useState<PurchasesPackage | null>(null);

    useEffect(() => {
        if (selected && packages.some((item) => item.identifier === selected.identifier)) return;
        setSelected(packages.find((item) => /annual|year/i.test(`${item.identifier} ${item.product.identifier}`)) ?? packages[0] ?? null);
    }, [currentOffering, packages, selected]);

    const sourceMessage = useMemo(
        () =>
            ((
                {
                    vehicle: "A second vehicle is included with AutoCare Plus.",
                    document:
                        "Document storage and automatic upload are included with AutoCare Plus.",
                    export: "CSV reports are included with AutoCare Plus.",
                    reminder:
                        "Recurring reminders are included with AutoCare Plus.",
                    insights:
                        "Advanced insights are included with AutoCare Plus.",
                    family:
                        "Share one garage with up to six family members or drivers.",
                } as Record<string, string>
            )[route.params?.source ?? ""] ??
            "Unlock every Plus feature for your garage."),
        [route.params?.source]
    );

    const buy = async () => {
        if (!selected) return;
        clearError();
        if (await purchase(selected, familyMode ? ENTITLEMENTS.sharedGarage : ENTITLEMENTS.plusFeatures)) {
            Alert.alert(`AutoCare ${familyMode ? "Family" : "Plus"}`, `${familyMode ? "Family" : "Plus"} is active on your account.`, [
                { text: "Continue", onPress: navigation.goBack },
            ]);
        }
    };

    const restore = async () => {
        clearError();
        const restored = await restorePurchases(familyMode ? ENTITLEMENTS.sharedGarage : ENTITLEMENTS.plusFeatures);
        Alert.alert(
            "Restore purchases",
            restored
                ? `Your AutoCare ${familyMode ? "Family" : "Plus"} purchase was restored.`
                : `No active ${familyMode ? "Family" : "Plus"} purchase was found.`
        );
        if (restored) navigation.goBack();
    };

    const targetActive = familyMode ? hasFamily : hasPlus;

    if (targetActive) {
        return (
            <Screen contentStyle={styles.centered}>
                <View style={styles.successIcon}>
                    <Ionicons name="checkmark" color={colors.white} size={34} />
                </View>
                <Text style={styles.hero}>AutoCare {familyMode ? "Family" : "Plus"} is active</Text>
                <Text style={styles.subtitle}>
                    Your paid features are available on every device signed into
                    this account.
                </Text>
                <Button
                    label="Continue"
                    icon="arrow-forward"
                    onPress={navigation.goBack}
                />
            </Screen>
        );
    }

    return (
        <Screen>
            <View style={styles.heroMark}>
                <Ionicons name="sparkles" color={colors.white} size={28} />
            </View>
            <Text style={styles.eyebrow}>AUTOCARE {familyMode ? "FAMILY" : "PLUS"}</Text>
            <Text style={styles.hero}>{familyMode ? "One garage. Everyone in sync." : "More capability for every mile."}</Text>
            <Text style={styles.subtitle}>{sourceMessage}</Text>

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
                        Billing setup required
                    </Text>
                    <Text style={styles.noticeBody}>
                        Add the RevenueCat public SDK key to this development
                        build to load Test Store products.
                    </Text>
                </Card>
            ) : null}

            <View style={styles.packages}>
                {packages.map((item) => {
                    const active = selected?.identifier === item.identifier;
                    return (
                        <Pressable
                            key={item.identifier}
                            onPress={() => setSelected(item)}
                            style={[
                                styles.package,
                                active && styles.packageActive,
                            ]}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: active }}
                        >
                            <View
                                style={[
                                    styles.radio,
                                    active && styles.radioActive,
                                ]}
                            >
                                {active ? (
                                    <View style={styles.radioDot} />
                                ) : null}
                            </View>
                            <View style={styles.packageCopy}>
                                <Text style={styles.packageTitle}>
                                    {packageLabel(item)}
                                </Text>
                                <Text
                                    style={styles.packageDescription}
                                    numberOfLines={2}
                                >
                                    {item.product.description ||
                                        item.product.title}
                                </Text>
                            </View>
                            <View style={styles.price}>
                                <Text style={styles.priceValue}>
                                    {item.product.priceString}
                                </Text>
                                <Text style={styles.pricePeriod}>
                                    {periodLabel(item)}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>

            {!loading && configured && packages.length === 0 ? (
                <Card style={styles.notice}>
                    <Text style={styles.noticeTitle}>
                        No offering available
                    </Text>
                    <Text style={styles.noticeBody}>
                        Create monthly or yearly {familyMode ? "Family" : "Plus"} products, attach
                        them to the current offering, and map them to the{" "}
                        {familyMode ? `${ENTITLEMENTS.plusFeatures} and ${ENTITLEMENTS.sharedGarage}` : ENTITLEMENTS.plusFeatures} entitlement{familyMode ? "s" : ""}.
                    </Text>
                </Card>
            ) : null}

            <Button
                label={
                    selected
                        ? `Continue with ${selected.product.priceString}`
                        : "Choose a plan"
                }
                icon="lock-open-outline"
                loading={purchasing}
                disabled={!selected || !configured}
                onPress={() => void buy()}
            />
            <Button
                label="Restore purchases"
                variant="ghost"
                loading={purchasing}
                onPress={() => void restore()}
            />
            <Text style={styles.finePrint}>
                Payment renews according to the selected store plan until
                cancelled. The localized price above comes directly from
                RevenueCat.
            </Text>
        </Screen>
    );
}

function packageLabel(item: PurchasesPackage) {
    const identity = `${item.identifier} ${item.product.identifier}`;
    if (item.packageType === "ANNUAL" || /annual|year/i.test(identity)) return "Yearly";
    if (item.packageType === "MONTHLY" || /month/i.test(identity)) return "Monthly";
    return item.product.title || item.identifier;
}

function isFamilyPackage(item: PurchasesPackage) {
    return /family/i.test([
        item.identifier,
        item.product.identifier,
        item.product.title,
    ].join(" "));
}

function periodLabel(item: PurchasesPackage) {
    const identity = `${item.identifier} ${item.product.identifier}`;
    if (item.packageType === "ANNUAL" || /annual|year/i.test(identity)) return "per year";
    if (item.packageType === "MONTHLY" || /month/i.test(identity)) return "per month";
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
    benefit: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    benefitIcon: {
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: colors.primarySoft,
        alignItems: "center",
        justifyContent: "center",
    },
    benefitCopy: { flex: 1 },
    benefitTitle: { ...typography.bodyStrong, color: colors.ink },
    benefitBody: { ...typography.caption, color: colors.inkMuted },
    error: {
        borderRadius: radius.md,
        backgroundColor: colors.dangerSoft,
        padding: spacing.md,
        flexDirection: "row",
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
    packageCopy: { flex: 1 },
    packageTitle: { ...typography.bodyStrong, color: colors.ink },
    packageDescription: {
        ...typography.caption,
        color: colors.inkMuted,
        marginTop: 2,
    },
    price: { alignItems: "flex-end" },
    priceValue: { ...typography.bodyStrong, color: colors.ink },
    pricePeriod: { ...typography.caption, color: colors.inkMuted },
    finePrint: {
        ...typography.caption,
        color: colors.inkMuted,
        textAlign: "center",
        marginTop: spacing.md,
    },
});
