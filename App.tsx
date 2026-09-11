import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import DashboardScreen from "./src/Screens/v2/DashboardScreen";
import DocumentFormScreen from "./src/Screens/v2/DocumentFormScreen";
import DocumentsScreen from "./src/Screens/v2/DocumentsScreen";
import ExpenseFormScreen from "./src/Screens/v2/ExpenseFormScreen";
import ExpensesScreen from "./src/Screens/v2/ExpensesScreen";
import MoreScreen from "./src/Screens/v2/MoreScreen";
import NearbyScreen from "./src/Screens/v2/NearbyScreen";
import ProfileEditScreen from "./src/Screens/v2/ProfileEditScreen";
import ReminderFormScreen from "./src/Screens/v2/ReminderFormScreen";
import RemindersScreen from "./src/Screens/v2/RemindersScreen";
import SettingsScreen from "./src/Screens/v2/SettingsScreen";
import VehicleDetailScreen from "./src/Screens/v2/VehicleDetailScreen";
import VehicleFormScreen from "./src/Screens/v2/VehicleFormScreen";
import VehiclesScreen from "./src/Screens/v2/VehiclesScreen";
import LoginScreen from "./src/Screens/LoginScreen";
import RegisterScreen from "./src/Screens/RegisterScreen";
import ForgotPasswordScreen from "./src/Screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./src/Screens/ResetPasswordScreen";
import { PreferencesProvider, usePreferences } from "./src/i18n/PreferencesProvider";
import { AuthStackParamList, MainTabParamList, RootStackParamList } from "./src/navigation/types";
import { navigationRef } from "./src/navigation/navigationRef";
import { PowerSyncProvider } from "./src/powersync/PowerSyncProvider";
import { AuthProvider, useAuth } from "./src/providers/AuthProvider";
import { SubscriptionProvider } from "./src/billing/SubscriptionProvider";
import { ConnectivityProvider, useConnectivity } from "./src/providers/ConnectivityProvider";
import { DocumentSyncProvider } from "./src/providers/DocumentSyncProvider";
import { GarageProvider, useGarage } from "./src/providers/GarageProvider";
import { ReminderNotificationProvider } from "./src/providers/ReminderNotificationProvider";
import { colors, spacing, typography } from "./src/theme/tokens";
import PaywallScreen from "./src/Screens/v2/PaywallScreen";
import SubscriptionScreen from "./src/Screens/v2/SubscriptionScreen";
import MembershipsScreen from "./src/Screens/v2/MembershipsScreen";
import DataImportScreen from "./src/Screens/v2/DataImportScreen";
import OwnershipScreen from "./src/Screens/v2/OwnershipScreen";
import TripsScreen from "./src/Screens/v2/TripsScreen";
import TripFormScreen from "./src/Screens/v2/TripFormScreen";
import ScheduledReportsScreen from "./src/Screens/v2/ScheduledReportsScreen";
import ChecklistsScreen from "./src/Screens/v2/ChecklistsScreen";
import ChecklistRunScreen from "./src/Screens/v2/ChecklistRunScreen";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const navigationTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.canvas,
        card: colors.surface,
        text: colors.ink,
        border: colors.border,
        notification: colors.danger,
    },
};

export default function App() {
    return (
        <SafeAreaProvider>
            <PowerSyncProvider>
                <PreferencesProvider>
                    <AuthProvider>
                        <ConnectivityProvider>
                            <GarageProvider>
                                <SubscriptionProvider>
                                    <ReminderNotificationProvider>
                                        <DocumentSyncProvider>
                                            <StatusBar style="dark" />
                                            <NavigationContainer ref={navigationRef} theme={navigationTheme}>
                                                <AppNavigator />
                                            </NavigationContainer>
                                        </DocumentSyncProvider>
                                    </ReminderNotificationProvider>
                                </SubscriptionProvider>
                            </GarageProvider>
                        </ConnectivityProvider>
                    </AuthProvider>
                </PreferencesProvider>
            </PowerSyncProvider>
        </SafeAreaProvider>
    );
}

function AppNavigator() {
    const { session, loading, isPasswordRecovery } = useAuth();
    const { ready, t } = usePreferences();

    if (loading || !ready) {
        return (
            <View style={styles.loading}>
                <View style={styles.loadingMark}><Ionicons name="car-sport" size={32} color={colors.white} /></View>
                <Text style={styles.loadingTitle}>{t("appName")}</Text>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    if (isPasswordRecovery) {
        return (
            <AuthStack.Navigator key="password-recovery" screenOptions={{ headerShown: false, gestureEnabled: false }}>
                <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            </AuthStack.Navigator>
        );
    }

    if (!session) {
        return (
            <AuthStack.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}>
                <AuthStack.Screen name="Login" component={LoginScreen} />
                <AuthStack.Screen name="Register" component={RegisterScreen} />
                <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </AuthStack.Navigator>
        );
    }

    return <InitialSyncGate key={session.user.id}><RootNavigator /></InitialSyncGate>;
}

function InitialSyncGate({ children }: PropsWithChildren) {
    const { profile } = useAuth();
    const { vehicles, loading } = useGarage();
    const { isOnline, syncState, lastSyncedAt } = useConnectivity();
    const { t } = usePreferences();
    const startedAt = useRef(Date.now());
    const [elapsed, setElapsed] = useState(0);
    const [continueOffline, setContinueOffline] = useState(false);
    const syncedSinceOpening = Boolean(lastSyncedAt && lastSyncedAt.getTime() >= startedAt.current - 1_000);
    const ready = !loading && (
        Boolean(profile)
        || vehicles.length > 0
        || syncedSinceOpening
        || !isOnline
        || syncState === "error"
    );

    useEffect(() => {
        if (ready || continueOffline) return;
        const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1_000)), 1_000);
        return () => clearInterval(timer);
    }, [continueOffline, ready]);

    if (ready || continueOffline) return <>{children}</>;
    return (
        <View style={styles.initialSync}>
            <View style={styles.loadingMark}><Ionicons name="cloud-download-outline" size={32} color={colors.white} /></View>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingTitle}>{t("initialSyncTitle")}</Text>
            <Text style={styles.loadingBody}>{t("initialSyncEstimate")}</Text>
            <Text style={styles.elapsed}>{t("elapsedSeconds")}: {elapsed}</Text>
            {elapsed >= 12 ? (
                <Pressable onPress={() => setContinueOffline(true)} style={styles.continueButton} accessibilityRole="button">
                    <Text style={styles.continueButtonText}>{t("continueOffline")}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

function RootNavigator() {
    const { t } = usePreferences();
    const screenOptions = {
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "700" as const },
        headerBackTitle: t("back"),
        headerBackButtonDisplayMode: "default" as const,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.canvas },
    };
    return (
        <RootStack.Navigator screenOptions={screenOptions}>
            <RootStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <RootStack.Screen name="VehicleForm" component={VehicleFormScreen} options={({ navigation, route }) => ({ title: route.params?.vehicleId ? t("editVehicle") : t("addVehicle"), presentation: "fullScreenModal", animation: "slide_from_bottom", headerRight: () => <ModalCloseButton label={t("close")} onPress={navigation.goBack} /> })} />
            <RootStack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: t("vehicleDetails") }} />
            <RootStack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={({ navigation, route }) => ({ title: route.params?.expenseId ? t("editExpense") : t("addExpense"), presentation: "fullScreenModal", animation: "slide_from_bottom", headerRight: () => <ModalCloseButton label={t("close")} onPress={navigation.goBack} /> })} />
            <RootStack.Screen name="ReminderForm" component={ReminderFormScreen} options={({ navigation, route }) => ({ title: route.params?.reminderId ? t("editReminder") : t("addReminder"), presentation: "fullScreenModal", animation: "slide_from_bottom", headerRight: () => <ModalCloseButton label={t("close")} onPress={navigation.goBack} /> })} />
            <RootStack.Screen name="DocumentForm" component={DocumentFormScreen} options={({ navigation, route }) => ({ title: route.params?.documentId ? t("editDocument") : t("addDocument"), presentation: "fullScreenModal", animation: "slide_from_bottom", headerRight: () => <ModalCloseButton label={t("close")} onPress={navigation.goBack} /> })} />
            <RootStack.Screen name="Documents" component={DocumentsScreen} options={{ title: t("documents") }} />
            <RootStack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: t("editProfile") }} />
            <RootStack.Screen name="Settings" component={SettingsScreen} options={{ title: t("settings") }} />
            <RootStack.Screen name="Nearby" component={NearbyScreen} options={{ title: t("nearby") }} />
            <RootStack.Screen
                name="Paywall"
                component={PaywallScreen}
                options={({ navigation }) => ({
                    title: "AutoCare Plus",
                    presentation: "fullScreenModal",
                    animation: "slide_from_bottom",
                    headerRight: () => (
                        <ModalCloseButton
                            label={t("close")}
                            onPress={navigation.goBack}
                        />
                    ),
                })}
            />
            <RootStack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: t("subscription") }} />
            <RootStack.Screen name="Memberships" component={MembershipsScreen} options={{ title: t("garageMembers") }} />
            <RootStack.Screen name="DataImport" component={DataImportScreen} options={{ title: t("importHistory") }} />
            <RootStack.Screen name="Ownership" component={OwnershipScreen} options={{ title: t("ownershipCosts") }} />
            <RootStack.Screen name="Trips" component={TripsScreen} options={{ title: t("tripLog") }} />
            <RootStack.Screen name="TripForm" component={TripFormScreen} options={({ navigation, route }) => ({ title: route.params?.tripId ? t("editTrip") : t("addTrip"), presentation: "fullScreenModal", animation: "slide_from_bottom", headerRight: () => <ModalCloseButton label={t("close")} onPress={navigation.goBack} /> })} />
            <RootStack.Screen name="ScheduledReports" component={ScheduledReportsScreen} options={{ title: t("scheduledReports") }} />
            <RootStack.Screen name="Checklists" component={ChecklistsScreen} options={{ title: t("fleetChecklists") }} />
            <RootStack.Screen name="ChecklistRun" component={ChecklistRunScreen} options={{ title: t("inspectionTitle") }} />
        </RootStack.Navigator>
    );
}

function ModalCloseButton({ label, onPress }: { label: string; onPress: () => void }) {
    return (
        <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={10} onPress={onPress} style={styles.modalClose}>
            <Ionicons name="close" size={25} color={colors.ink} />
        </Pressable>
    );
}

function MainTabs() {
    const { t } = usePreferences();
    const icons: Record<keyof MainTabParamList, [string, string]> = {
        Dashboard: ["grid-outline", "grid"],
        Vehicles: ["car-outline", "car"],
        Expenses: ["receipt-outline", "receipt"],
        Reminders: ["notifications-outline", "notifications"],
        More: ["ellipsis-horizontal-circle-outline", "ellipsis-horizontal-circle"],
    };
    const titles: Record<keyof MainTabParamList, string> = {
        Dashboard: t("dashboard"), Vehicles: t("vehicles"), Expenses: t("expenses"), Reminders: t("reminders"), More: t("more"),
    };
    return (
        <Tabs.Navigator
            screenOptions={({ route }) => ({
                headerStyle: { backgroundColor: colors.surface },
                headerShadowVisible: false,
                headerTitleStyle: { color: colors.ink, fontWeight: "800" },
                tabBarPosition: "bottom",
                tabBarLabelPosition: "below-icon",
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.inkMuted,
                tabBarLabelStyle: styles.tabLabel,
                title: titles[route.name],
                tabBarIcon: ({ color, focused, size }) => (
                    <Ionicons name={icons[route.name][focused ? 1 : 0] as never} color={color} size={size} />
                ),
            })}
        >
            <Tabs.Screen name="Dashboard" component={DashboardScreen} />
            <Tabs.Screen name="Vehicles" component={VehiclesScreen} />
            <Tabs.Screen name="Expenses" component={ExpensesScreen} />
            <Tabs.Screen name="Reminders" component={RemindersScreen} />
            <Tabs.Screen name="More" component={MoreScreen} />
        </Tabs.Navigator>
    );
}

const styles = StyleSheet.create({
    loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, backgroundColor: colors.canvas },
    initialSync: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.canvas },
    loadingMark: { width: 66, height: 66, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    loadingTitle: { ...typography.title, color: colors.ink },
    loadingBody: { ...typography.body, color: colors.inkMuted, textAlign: "center" },
    elapsed: { ...typography.caption, color: colors.inkMuted },
    continueButton: { marginTop: spacing.sm, minHeight: 48, borderRadius: 14, paddingHorizontal: spacing.xl, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary },
    continueButtonText: { ...typography.bodyStrong, color: colors.primary },
    tabBar: { minHeight: 68, paddingTop: 7, paddingBottom: 8, backgroundColor: colors.surface, borderTopColor: colors.border },
    tabLabel: { fontSize: 11, fontWeight: "700" },
    modalClose: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
});
