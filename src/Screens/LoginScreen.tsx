import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, FormField } from "../components/ui";
import { usePreferences } from "../i18n/PreferencesProvider";
import { useAuth } from "../providers/AuthProvider";
import { colors, radius, spacing, typography } from "../theme/tokens";

export default function LoginScreen({ navigation }: any) {
    const { signIn, authError } = useAuth();
    const { t } = usePreferences();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!email.includes("@") || !password) {
            Alert.alert(t("invalidCredentials"));
            return;
        }
        setBusy(true);
        try {
            await signIn(email, password);
        } catch {
            Alert.alert(t("signIn"), t("signInFailed"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <LinearGradient colors={["#16274B", "#2F6BFF"]} style={styles.flex}>
            <SafeAreaView style={styles.flex}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
                    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                        <View style={styles.brand}>
                            <View style={styles.logoWrap}>
                                <Image source={require("../../assets/AutoCareIcon.png")} style={styles.logo} />
                            </View>
                            <Text style={styles.appName}>{t("appName")}</Text>
                            <Text style={styles.tagline}>{t("authWelcome")}</Text>
                        </View>

                        <View style={styles.panel}>
                            <Text style={styles.title}>{t("signIn")}</Text>
                            <FormField
                                label={t("email")}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                autoComplete="email"
                                keyboardType="email-address"
                                returnKeyType="next"
                            />
                            <FormField
                                label={t("password")}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoComplete="current-password"
                                returnKeyType="done"
                                onSubmitEditing={submit}
                            />
                            {authError ? <Text style={styles.error}>{authError}</Text> : null}
                            <Pressable
                                onPress={() => navigation.navigate("ForgotPassword", { email: email.trim() })}
                                hitSlop={8}
                                accessibilityRole="button"
                            >
                                <Text style={styles.link}>{t("forgotPassword")}</Text>
                            </Pressable>
                            <Button label={t("signIn")} onPress={submit} loading={busy} />
                            <View style={styles.inline}>
                                <Text style={styles.footerText}>{t("noAccount")}</Text>
                                <Pressable
                                    accessibilityRole="button"
                                    hitSlop={8}
                                    onPress={() => navigation.navigate("Register")}
                                    style={styles.inlineAction}
                                >
                                    <Text style={styles.footerLink}>{t("signUp")}</Text>
                                </Pressable>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    content: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.xxl },
    brand: { alignItems: "center", gap: spacing.sm },
    logoWrap: { width: 88, height: 88, borderRadius: 28, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
    logo: { width: 72, height: 72, resizeMode: "contain" },
    appName: { ...typography.hero, color: colors.white },
    tagline: { ...typography.body, color: "rgba(255,255,255,0.82)", textAlign: "center", maxWidth: 340 },
    panel: { width: "100%", maxWidth: 520, alignSelf: "center", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg },
    title: { ...typography.title, color: colors.ink },
    link: { ...typography.label, color: colors.primary },
    footerText: { ...typography.body, color: colors.inkMuted },
    footerLink: { ...typography.bodyStrong, color: colors.primary },
    inline: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", columnGap: spacing.sm },
    inlineAction: { justifyContent: "center" },
    error: { ...typography.caption, color: colors.danger },
});
