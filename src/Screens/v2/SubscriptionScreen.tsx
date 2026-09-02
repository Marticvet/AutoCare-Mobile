import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { Button, Card, Row, Screen, SectionHeader } from "../../components/ui";
import { useSubscription } from "../../billing/SubscriptionProvider";
import { RootStackParamList } from "../../navigation/types";
import { colors, radius, spacing, typography } from "../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Subscription">;

export default function SubscriptionScreen({ navigation }: Props) {
    const {
        isAdmin,
        hasPlus,
        hasFamily,
        hasFleet,
        backendStatus,
        customerInfo,
        error,
        loading,
        purchasing,
        refresh,
        restorePurchases,
        manageSubscription,
    } = useSubscription();
    const [restored, setRestored] = useState(false);
    const entitlement = customerInfo?.entitlements.active.shared_garage
        ?? customerInfo?.entitlements.active.plus_features;
    const planName = isAdmin ? "Administrator" : hasFleet ? "AutoCare Fleet" : hasFamily ? "AutoCare Family" : hasPlus ? "AutoCare Plus" : "Free";
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
            "Restore purchases",
            active
                ? "AutoCare Plus is active."
                : "No active purchase was found."
        );
    };

    return (
        <Screen>
            <SectionHeader title="Your plan" />
            <View style={[styles.plan, hasPlus && styles.planPlus]}>
                <View style={styles.planTop}>
                    <View style={[styles.icon, hasPlus && styles.iconPlus]}>
                        <Ionicons
                            name={hasPlus ? "sparkles" : "person-outline"}
                            color={hasPlus ? colors.ink : colors.primary}
                            size={25}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
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
                                ? "Administrator access · no subscription required"
                                : hasPlus
                                ? willRenew
                                    ? "Active · renews automatically"
                                    : "Active · ends at expiry"
                                : "Core tracking for one vehicle"}
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
                        {willRenew ? "Renews" : "Expires"}{" "}
                        {new Date(expiration).toLocaleDateString()}
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
                        Purchase history checked.
                    </Text>
                </View>
            ) : null}

            <View style={styles.actions}>
                {!hasPlus ? (
                    <Button
                        label="Compare Plus plans"
                        icon="sparkles-outline"
                        onPress={() => navigation.navigate("Paywall")}
                    />
                ) : !isAdmin ? (
                    <Button
                        label="Manage subscription"
                        icon="open-outline"
                        onPress={() => void manageSubscription()}
                    />
                ) : null}
                {!isAdmin && !hasFamily && !hasFleet ? (
                    <Button
                        label="Compare Family plans"
                        icon="people-outline"
                        variant="secondary"
                        onPress={() => navigation.navigate("Paywall", { source: "family" })}
                    />
                ) : null}
                {!isAdmin ? (
                    <Button
                        label="Restore purchases"
                        icon="refresh-outline"
                        variant="secondary"
                        loading={purchasing}
                        onPress={() => void restore()}
                    />
                ) : null}
                <Button
                    label="Refresh status"
                    icon="sync-outline"
                    variant="ghost"
                    loading={loading}
                    onPress={() => void refresh()}
                />
            </View>

            <SectionHeader title="Included on Free" />
            <Card style={styles.list}>
                <Feature title="One vehicle" />
                <Feature title="Expenses and fuel history" />
                <Feature title="Basic reminders" />
                <Feature title="Offline-first synchronization" />
            </Card>
            <SectionHeader title="Legal and support" />
            <Card style={styles.list}>
                <ExternalRow
                    title="Terms of service"
                    envKey={process.env.EXPO_PUBLIC_TERMS_URL}
                />
                <View style={styles.divider} />
                <ExternalRow
                    title="Privacy policy"
                    envKey={process.env.EXPO_PUBLIC_PRIVACY_URL}
                />
                <View style={styles.divider} />
                <ExternalRow
                    title="Contact support"
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
    const open = async () => {
        if (!envKey)
            return Alert.alert(
                title,
                "Configure this URL in the app environment before release."
            );
        if (!(await Linking.canOpenURL(envKey)))
            return Alert.alert(title, "This link could not be opened.");
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
    planTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
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
    successText: { ...typography.caption, color: colors.success },
    list: { paddingVertical: spacing.sm },
    feature: {
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    featureText: { ...typography.body, color: colors.ink },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginLeft: 54,
    },
});
