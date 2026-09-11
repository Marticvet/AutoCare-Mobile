import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { Button, Card, Row, Screen, SectionHeader } from "../../components/ui";
import { useSubscription } from "../../billing/SubscriptionProvider";
import { RootStackParamList } from "../../navigation/types";
import { colors, radius, spacing, typography } from "../../theme/tokens";
import { usePreferences } from "../../i18n/PreferencesProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Subscription">;

export default function SubscriptionScreen({ navigation }: Props) {
    const { t, locale } = usePreferences();
    const {
        isAdmin,
        hasPlus,
        hasFamily,
        hasFleet,
        backendStatus,
        customerInfo,
        error,
        purchasing,
        refresh,
        restorePurchases,
        manageSubscription,
    } = useSubscription();
    const [restored, setRestored] = useState(false);
    const entitlement = customerInfo?.entitlements.active.shared_garage
        ?? customerInfo?.entitlements.active.plus_features;
    const planName = isAdmin ? t("administrator") : hasFleet ? "AutoCare Fleet" : hasFamily ? "AutoCare Family" : hasPlus ? "AutoCare Plus" : t("free");
    const expiration =
        entitlement?.expirationDate ?? backendStatus?.expires_at ?? null;
    const willRenew =
        entitlement?.willRenew ?? backendStatus?.will_renew ?? false;
    const productId =
        entitlement?.productIdentifier ?? backendStatus?.product_id ?? null;

    const restore = async () => {
        const active = await restorePurchases();
        setRestored(true);
        Alert.alert(
            t("restorePurchases"),
            active
                ? t("plusActive")
                : t("noActivePurchase")
        );
    };

    return (
        <Screen>
            <SectionHeader title={t("yourPlan")} />
            <View style={[styles.plan, hasPlus && styles.planPlus]}>
                <View style={styles.planTop}>
                    <View style={[styles.icon, hasPlus && styles.iconPlus]}>
                        <Ionicons
                            name={hasPlus ? "sparkles" : "person-outline"}
                            color={hasPlus ? colors.ink : colors.primary}
                            size={25}
                        />
                    </View>
                    <View style={styles.planCopy}>
                        <Text
                            style={[
                                styles.planName,
                                hasPlus && styles.planNamePlus,
                            ]}
                        >
                            {planName}
                        </Text>
                        <Text
                            style={[
                                styles.planStatus,
                                hasPlus && styles.planStatusPlus,
                            ]}
                        >
                            {isAdmin
                                ? t("adminAccessStatus")
                                : hasPlus
                                ? willRenew
                                    ? t("activeRenews")
                                    : t("activeEnds")
                                : t("coreTrackingOneVehicle")}
                        </Text>
                    </View>
                </View>
                {!isAdmin && expiration ? (
                    <Text
                        style={[
                            styles.expiry,
                            hasPlus && styles.planStatusPlus,
                        ]}
                    >
                        {willRenew
                            ? t("renewsOn", { date: new Date(expiration).toLocaleDateString(locale) })
                            : t("expiresOn", { date: new Date(expiration).toLocaleDateString(locale) })}
                    </Text>
                ) : null}
                {!isAdmin && productId ? (
                    <Text
                        style={[
                            styles.product,
                            hasPlus && styles.planStatusPlus,
                        ]}
                    >
                        {productId}
                    </Text>
                ) : null}
            </View>

            {error ? (
                <View style={styles.error}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}
            {restored ? (
                <View style={styles.success}>
                    <Ionicons
                        name="checkmark-circle"
                        size={19}
                        color={colors.success}
                    />
                    <Text style={styles.successText}>
                        {t("purchaseHistoryChecked")}
                    </Text>
                </View>
            ) : null}

            <View style={styles.actions}>
                {!hasPlus ? (
                    <Button
                        label={t("comparePlusPlans")}
                        icon="sparkles-outline"
                        onPress={() => navigation.navigate("Paywall")}
                    />
                ) : !isAdmin ? (
                    <Button
                        label={t("manageSubscription")}
                        icon="open-outline"
                        onPress={() => void manageSubscription()}
                    />
                ) : null}
                {!isAdmin && !hasFamily && !hasFleet ? (
                    <Button
                        label={t("compareFamilyPlans")}
                        icon="people-outline"
                        variant="secondary"
                        onPress={() => navigation.navigate("Paywall", { source: "family" })}
                    />
                ) : null}
                {!isAdmin ? (
                    <Button
                        label={t("restorePurchases")}
                        icon="refresh-outline"
                        variant="secondary"
                        loading={purchasing}
                        onPress={() => void restore()}
                    />
                ) : null}
                {error && !isAdmin ? (
                    <Button
                        label={t("retry")}
                        icon="sync-outline"
                        variant="ghost"
                        onPress={() => void refresh()}
                    />
                ) : null}
            </View>

            <SectionHeader title={t("includedOnFree")} />
            <Card style={styles.list}>
                <Feature title={t("oneVehicle")} />
                <Feature title={t("expensesFuelHistory")} />
                <Feature title={t("basicReminders")} />
                <Feature title={t("offlineFirstSync")} />
            </Card>
            <SectionHeader title={t("legalSupport")} />
            <Card style={styles.list}>
                <ExternalRow
                    title={t("termsOfService")}
                    envKey={process.env.EXPO_PUBLIC_TERMS_URL}
                />
                <View style={styles.divider} />
                <ExternalRow
                    title={t("privacyPolicy")}
                    envKey={process.env.EXPO_PUBLIC_PRIVACY_URL}
                />
                <View style={styles.divider} />
                <ExternalRow
                    title={t("contactSupport")}
                    envKey={process.env.EXPO_PUBLIC_SUPPORT_URL}
                />
            </Card>
        </Screen>
    );
}

function Feature({ title }: { title: string }) {
    return (
        <View style={styles.feature}>
            <Ionicons
                name="checkmark-circle"
                size={19}
                color={colors.success}
            />
            <Text style={styles.featureText}>{title}</Text>
        </View>
    );
}

function ExternalRow({ title, envKey }: { title: string; envKey?: string }) {
    const { t } = usePreferences();
    const open = async () => {
        if (!envKey)
            return Alert.alert(
                title,
                t("configureUrl")
            );
        if (!(await Linking.canOpenURL(envKey)))
            return Alert.alert(title, t("linkOpenFailed"));
        await Linking.openURL(envKey);
    };
    return (
        <Row icon="open-outline" title={title} onPress={() => void open()} />
    );
}

const styles = StyleSheet.create({
    plan: {
        borderRadius: radius.xl,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.xl,
    },
    planPlus: { backgroundColor: colors.primary, borderColor: colors.primary },
    planTop: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md },
    planCopy: { flexGrow: 1, flexBasis: 190, minWidth: 0 },
    icon: {
        width: 50,
        height: 50,
        borderRadius: 17,
        backgroundColor: colors.primarySoft,
        alignItems: "center",
        justifyContent: "center",
    },
    iconPlus: { backgroundColor: colors.warning },
    planName: { ...typography.heading, color: colors.ink },
    planNamePlus: { color: colors.white },
    planStatus: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
    planStatusPlus: { color: "#DDE6FF" },
    expiry: {
        ...typography.caption,
        color: colors.inkMuted,
        marginTop: spacing.lg,
    },
    product: {
        ...typography.caption,
        color: colors.inkMuted,
        marginTop: spacing.xs,
    },
    actions: { gap: spacing.sm, marginTop: spacing.lg },
    error: {
        borderRadius: radius.md,
        backgroundColor: colors.dangerSoft,
        padding: spacing.md,
        marginTop: spacing.md,
    },
    errorText: { ...typography.caption, color: colors.danger },
    success: {
        borderRadius: radius.md,
        backgroundColor: colors.successSoft,
        padding: spacing.md,
        marginTop: spacing.md,
        flexDirection: "row",
        gap: spacing.sm,
    },
    successText: { ...typography.caption, color: colors.success, flex: 1, minWidth: 0 },
    list: { paddingVertical: spacing.sm },
    feature: {
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    featureText: { ...typography.body, color: colors.ink, flex: 1, minWidth: 0 },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginLeft: 54,
    },
});
