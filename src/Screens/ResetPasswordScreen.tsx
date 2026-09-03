import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, FormField } from "../components/ui";
import { usePreferences } from "../i18n/PreferencesProvider";
import { useAuth } from "../providers/AuthProvider";
import { colors, radius, shadow, spacing, typography } from "../theme/tokens";

export default function ResetPasswordScreen() {
    const {
        session,
        passwordRecoveryLoading,
        passwordRecoveryError,
        completePasswordRecovery,
        cancelPasswordRecovery,
    } = useAuth();
    const { t } = usePreferences();
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        if (password.length < 8) {
            setError(t("passwordTooShort"));
            return;
        }
        if (password !== confirmation) {
            setError(t("passwordsMismatch"));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await completePasswordRecovery(password);
            Alert.alert(t("passwordChanged"), t("passwordResetSuccess"));
        } catch (updateError) {
            setError((updateError as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const linkError = passwordRecoveryError || (!passwordRecoveryLoading && !session ? t("resetLinkInvalid") : null);

    return (
        <LinearGradient colors={["#102044", "#2F6BFF"]} style={styles.flex}>
            <SafeAreaView style={styles.flex}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
                    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                        <View style={styles.heading}>
                            <View style={[styles.heroIcon, linkError && styles.heroIconError]}>
                                <Ionicons name={linkError ? "alert-circle-outline" : "lock-closed-outline"} size={32} color={linkError ? colors.danger : colors.primary} />
                            </View>
                            <Text style={styles.title}>{linkError ? t("resetLinkProblem") : t("chooseNewPassword")}</Text>
                            <Text style={styles.subtitle}>{linkError ? t("resetLinkInvalid") : t("chooseNewPasswordIntro")}</Text>
                        </View>

                        <View style={styles.panel}>
                            {passwordRecoveryLoading ? (
                                <View style={styles.loadingRow}>
                                    <Ionicons name="hourglass-outline" size={23} color={colors.primary} />
                                    <Text style={styles.loadingText}>{t("validatingResetLink")}</Text>
                                </View>
                            ) : linkError ? (
                                <>
                                    <View style={styles.errorBox}>
                                        <Text style={styles.error}>{linkError}</Text>
                                    </View>
                                    <Button label={t("backToSignIn")} onPress={() => void cancelPasswordRecovery()} />
                                </>
                            ) : (
                                <>
                                    <FormField
                                        label={t("newPassword")}
                                        value={password}
                                        onChangeText={(value) => {
                                            setPassword(value);
                                            if (error) setError(null);
                                        }}
                                        secureTextEntry
                                        autoComplete="new-password"
                                        textContentType="newPassword"
                                        hint={t("passwordTooShort")}
                                        required
                                    />
                                    <FormField
                                        label={t("confirmNewPassword")}
                                        value={confirmation}
                                        onChangeText={(value) => {
                                            setConfirmation(value);
                                            if (error) setError(null);
                                        }}
                                        secureTextEntry
                                        autoComplete="new-password"
                                        textContentType="newPassword"
                                        error={error ?? undefined}
                                        returnKeyType="done"
                                        onSubmitEditing={submit}
                                        required
                                    />
                                    <Button label={t("updatePassword")} icon="checkmark" onPress={submit} loading={busy} />
                                    <Button label={t("cancel")} onPress={() => void cancelPasswordRecovery()} variant="ghost" />
                                </>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    content: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxxl, justifyContent: "center", gap: spacing.xxl },
    heading: { alignItems: "center", gap: spacing.md },
    heroIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", ...shadow },
    heroIconError: { backgroundColor: colors.dangerSoft },
    title: { ...typography.hero, color: colors.white, textAlign: "center" },
    subtitle: { ...typography.body, color: "rgba(255,255,255,0.84)", textAlign: "center", maxWidth: 380 },
    panel: { width: "100%", maxWidth: 480, alignSelf: "center", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg, ...shadow },
    loadingRow: { minHeight: 96, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md },
    loadingText: { ...typography.bodyStrong, color: colors.ink },
    errorBox: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.dangerSoft },
    error: { ...typography.body, color: colors.danger },
});
