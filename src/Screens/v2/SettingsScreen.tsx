import Constants from "expo-constants";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { Button, Card, ChoiceChips, Row, Screen, SectionHeader, SelectField } from "../../components/ui";
import { useReminders } from "../../data/liveQueries";
import { Currency, DistanceUnit, Language, usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { system } from "../../powersync/PowerSync";
import { useAuth } from "../../providers/AuthProvider";
import { useConnectivity } from "../../providers/ConnectivityProvider";
import { useGarage } from "../../providers/GarageProvider";
import { getReminderNotificationPermission, reconcileReminderNotifications, requestReminderNotificationPermission, sendReminderTestNotification } from "../../services/reminderNotifications";
import { colors, spacing, typography } from "../../theme/tokens";

export default function SettingsScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t, language, currency, distanceUnit, setLanguage, setCurrency, setDistanceUnit } = usePreferences();
    const { profile, session, userId, logout } = useAuth();
    const { syncState, syncError, lastSyncedAt } = useConnectivity();
    const { vehicles } = useGarage();
    const { data: reminders } = useReminders(userId);
    const [notificationPermission, setNotificationPermission] = useState<"granted" | "denied" | "undetermined">("undetermined");
    const accountType = profile?.account_type || "individual";

    useEffect(() => {
        void getReminderNotificationPermission().then(setNotificationPermission).catch(() => setNotificationPermission("denied"));
    }, []);

    const enableNotifications = async () => {
        try {
            const granted = await requestReminderNotificationPermission();
            setNotificationPermission(granted ? "granted" : "denied");
            if (!granted) {
                Alert.alert(t("notificationsDisabled"), t("notificationPermissionDenied"), [
                    { text: t("cancel"), style: "cancel" },
                    { text: t("settings"), onPress: () => void Linking.openSettings() },
                ]);
                return false;
            }
            await reconcileReminderNotifications(reminders, vehicles, t("dueDate"), t("vehicle"));
            return true;
        } catch (error) {
            Alert.alert(t("notifications"), (error as Error).message);
            return false;
        }
    };

    const testNotifications = async () => {
        const granted = notificationPermission === "granted" || await enableNotifications();
        if (!granted) return;
        try {
            await sendReminderTestNotification(t("notifications"), t("notificationTestSent"));
            Alert.alert(t("notifications"), t("notificationTestSent"));
        } catch (error) {
            Alert.alert(t("notifications"), (error as Error).message);
        }
    };

    const setAccountType = async (value: string) => {
        if (!userId) return;
        await system.db.updateTable("profiles").set({ account_type: value, updated_at: new Date().toISOString() }).where("id", "=", userId).execute();
    };
    const logoutWithQueueCheck = async () => {
        const pending = await system.powersync.getUploadQueueStats();
        if (pending.count > 0) {
            Alert.alert(t("unsyncedChanges"), t("unsyncedLogoutBody"), [
                { text: t("cancel"), style: "cancel" },
                { text: t("discardAndSignOut"), style: "destructive", onPress: () => void logout() },
            ]);
            return;
        }
        await logout();
    };
    const confirmLogout = () => Alert.alert(t("signOut"), undefined, [
        { text: t("cancel"), style: "cancel" },
        { text: t("signOut"), style: "destructive", onPress: () => void logoutWithQueueCheck() },
    ]);

    return (
        <Screen>
            <View style={styles.section}>
                <SectionHeader title={t("profile")} />
                <Card style={styles.list}>
                    <Row
                        icon="person-outline"
                        title={profile?.full_name || t("appName")}
                        subtitle={session?.user.email}
                        onPress={() => navigation.navigate("ProfileEdit")}
                    />
                </Card>
                <Text style={styles.label}>{t("accountType")}</Text>
                <ChoiceChips value={accountType} onChange={(value) => void setAccountType(value)} options={[{ value: "individual", label: t("individual") }, { value: "fleet", label: t("fleetManager") }]} />
            </View>

            <View style={styles.section}>
                <SectionHeader title={t("language")} />
                <SelectField<Language>
                    label={t("language")}
                    value={language}
                    onChange={setLanguage}
                    options={[
                        { value: "en", label: t("english") },
                        { value: "de", label: t("german") },
                        { value: "bg", label: t("bulgarian") },
                        { value: "es", label: t("spanish") },
                        { value: "fr", label: t("french") },
                    ]}
                />
            </View>
            <View style={styles.section}>
                <SectionHeader title={t("currency")} />
                <SelectField<Currency>
                    label={t("currency")}
                    value={currency}
                    onChange={setCurrency}
                    options={(["EUR", "USD", "GBP", "BGN", "CHF", "PLN", "RON", "CZK", "HUF", "SEK", "NOK", "DKK", "CAD", "AUD", "JPY"] as Currency[]).map((value) => ({ value, label: value }))}
                />
            </View>
            <View style={styles.section}>
                <SectionHeader title={t("mileageUnit")} />
                <ChoiceChips<DistanceUnit> value={distanceUnit} onChange={setDistanceUnit} options={[{ value: "km", label: t("kilometers") }, { value: "mi", label: t("miles") }]} />
            </View>

            <View style={styles.section}>
                <SectionHeader title={t("storageAndSync")} />
                <Card style={styles.list}>
                    <Row icon={syncState === "synced" ? "cloud-done-outline" : "cloud-offline-outline"} title={t("localFirst")} subtitle={syncError || t("localFirstBody")} tone={syncState === "error" ? "red" : "green"} />
                    <View style={styles.divider} />
                    <Row icon="time-outline" title={t("lastSynced")} subtitle={lastSyncedAt ? lastSyncedAt.toLocaleString() : t("neverSynced")} />
                </Card>
            </View>

            <View style={styles.section}>
                <SectionHeader title={t("notifications")} />
                <Card style={styles.notificationCard}>
                    <Row
                        icon={notificationPermission === "granted" ? "notifications" : "notifications-off-outline"}
                        title={notificationPermission === "granted" ? t("notificationsEnabled") : t("notificationsDisabled")}
                        subtitle={t("notificationsBody")}
                        tone={notificationPermission === "granted" ? "green" : "amber"}
                    />
                    {notificationPermission !== "granted" ? <Button label={t("enableNotifications")} icon="notifications-outline" variant="secondary" onPress={() => void enableNotifications()} /> : null}
                    <Button label={t("testNotification")} icon="paper-plane-outline" variant="secondary" onPress={() => void testNotifications()} />
                </Card>
            </View>

            <View style={styles.section}>
                <SectionHeader title={t("dangerZone")} />
                <Button label={t("signOut")} icon="log-out-outline" variant="danger" onPress={confirmLogout} />
                <Text style={styles.version}>{t("version")} {Constants.expoConfig?.version ?? "1.0.0"}</Text>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    section: { gap: spacing.md },
    label: { ...typography.label, color: colors.ink },
    list: { paddingVertical: spacing.sm },
    notificationCard: { gap: spacing.md },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
    version: { ...typography.caption, color: colors.inkMuted, textAlign: "center" },
});
