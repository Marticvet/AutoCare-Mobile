import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card, Row, Screen, SectionHeader } from "../../components/ui";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useAuth } from "../../providers/AuthProvider";
import { colors, spacing, typography } from "../../theme/tokens";
import { useSubscription } from "../../billing/SubscriptionProvider";
import { releaseFeatures } from "../../config/releaseFeatures";

export default function MoreScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t } = usePreferences();
    const { profile, session } = useAuth();
    const { isAdmin, hasPlus, hasFamily, hasFleet } = useSubscription();
    const planName = isAdmin ? t("administrator") : hasFleet ? "AutoCare Fleet" : hasFamily ? "AutoCare Family" : hasPlus ? "AutoCare Plus" : t("freePlan");
    const displayName = profile?.full_name || session?.user.email || t("appName");
    return (
        <Screen>
            <View style={styles.section}>
                <SectionHeader title={t("profile")} />
                <Card style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text></View>
                        <View style={styles.profileText}>
                            <Text numberOfLines={1} style={styles.profileName}>{displayName}</Text>
                            <Text numberOfLines={1} style={styles.profileEmail}>{session?.user.email}</Text>
                        </View>
                    </View>
                    <Row icon="create-outline" title={t("editProfile")} onPress={() => navigation.navigate("ProfileEdit")} />
                </Card>
            </View>

            <SectionHeader title={t("toolsAndServices")} />
            <Card style={styles.list}>
                <Row icon={isAdmin ? "shield-checkmark-outline" : "sparkles-outline"} title={planName} subtitle={isAdmin ? t("allPremiumUnlocked") : hasPlus ? t("paidFeaturesActive") : t("comparePlansRestore")} tone={hasPlus ? "green" : "amber"} onPress={() => navigation.navigate("Subscription")} />
                <View style={styles.divider} />
                <Row icon="people-outline" title={t("garageMembers")} subtitle={t("garageMembersBody")} onPress={() => navigation.navigate("Memberships")} />
                <View style={styles.divider} />
                <Row icon="documents-outline" title={t("documents")} subtitle={t("noDocumentsBody")} onPress={() => navigation.navigate("Documents")} />
                <View style={styles.divider} />
                <Row icon="cloud-upload-outline" title={t("importHistory")} subtitle={t("importHistoryBody")} onPress={() => navigation.navigate("DataImport")} />
                <View style={styles.divider} />
                <Row icon="analytics-outline" title={t("budgetsOwnership")} subtitle={t("budgetsOwnershipBody")} onPress={() => navigation.navigate("Ownership")} />
                <View style={styles.divider} />
                <Row icon="navigate-outline" title={t("tripLog")} subtitle={t("tripLogBody")} onPress={() => navigation.navigate("Trips")} />
                <View style={styles.divider} />
                <Row
                    icon="mail-outline"
                    title={t("scheduledReports")}
                    subtitle={releaseFeatures.scheduledReportDelivery ? t("scheduledReportsBody") : t("currentReportsBody")}
                    onPress={() => navigation.navigate("ScheduledReports")}
                />
                <View style={styles.divider} />
                <Row icon="clipboard-outline" title={t("fleetChecklists")} subtitle={t("fleetChecklistsBody")} tone="amber" onPress={() => navigation.navigate("Checklists")} />
                <View style={styles.divider} />
                <Row icon="location-outline" title={t("nearby")} subtitle={`${t("nearbyFuel")} · ${t("nearbyService")}`} tone="green" onPress={() => navigation.navigate("Nearby")} />
                <View style={styles.divider} />
                <Row icon="settings-outline" title={t("settings")} subtitle={`${t("language")} · ${t("currency")} · ${t("storageAndSync")}`} onPress={() => navigation.navigate("Settings")} />
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    section: { gap: spacing.md },
    profileCard: { gap: spacing.md },
    profileHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    avatar: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
    avatarText: { ...typography.title, color: colors.white },
    profileText: { flex: 1, minWidth: 0, gap: 2 },
    profileName: { ...typography.heading, color: colors.ink },
    profileEmail: { ...typography.caption, color: colors.inkMuted },
    list: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
});
