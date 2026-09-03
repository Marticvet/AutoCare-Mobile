import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, FormField } from "../components/ui";
import { usePreferences } from "../i18n/PreferencesProvider";
import { AuthStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { colors, radius, shadow, spacing, typography } from "../theme/tokens";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function ForgotPasswordScreen({ navigation, route }: Props) {
    const { resetPassword } = useAuth();
    const { t } = usePreferences();
    const [email, setEmail] = useState(route.params?.email ?? "");
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const send = async () => {
        if (!isValidEmail(email)) {
            setError(t("invalidEmail"));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await resetPassword(email);
            setSent(true);
        } catch (requestError) {
            setError((requestError as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <LinearGradient colors={["#102044", "#2F6BFF"]} style={styles.flex}>
            <SafeAreaView style={styles.flex}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
                    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                        <Pressable
                            onPress={navigation.goBack}
                            accessibilityRole="button"
                            accessibilityLabel={t("backToSignIn")}
                            hitSlop={10}
                            style={styles.backButton}
                        >
                            <Ionicons name="chevron-back" size={24} color={colors.white} />
                            <Text style={styles.backText}>{t("signIn")}</Text>
                        </Pressable>

                        <View style={styles.heading}>
                            <View style={styles.heroIcon}>
                                <Ionicons name={sent ? "mail-open-outline" : "key-outline"} size={32} color={colors.primary} />
                            </View>
                            <Text style={styles.title}>{sent ? t("checkInbox") : t("resetPasswordTitle")}</Text>
                            <Text style={styles.subtitle}>
                                {sent ? t("resetEmailHelp") : t("resetPasswordIntro")}
                            </Text>
                        </View>

                        <View style={styles.panel}>
                            {sent ? (
                                <>
                                    <View style={styles.sentRow}>
                                        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                                        <View style={styles.sentCopy}>
                                            <Text style={styles.sentLabel}>{t("resetEmailSent")}</Text>
                                            <Text style={styles.sentEmail}>{email.trim().toLowerCase()}</Text>
                                        </View>
                                    </View>
                                    {error ? <Text style={styles.error}>{error}</Text> : null}
                                    <Button label={t("resendResetEmail")} onPress={send} loading={busy} variant="secondary" />
                                    <Button label={t("backToSignIn")} onPress={() => navigation.navigate("Login")} variant="ghost" />
                                </>
                            ) : (
                                <>
                                    <FormField
                                        label={t("email")}
                                        value={email}
                                        onChangeText={(value) => {
                                            setEmail(value);
                                            if (error) setError(null);
                                        }}
                                        error={error ?? undefined}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        autoComplete="email"
                                        keyboardType="email-address"
                                        textContentType="emailAddress"
                                        returnKeyType="send"
                                        onSubmitEditing={send}
                                        required
                                    />
                                    <Button label={t("sendResetLink")} icon="mail-outline" onPress={send} loading={busy} />
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
    backButton: { position: "absolute", top: spacing.lg, left: spacing.xl, zIndex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.xs },
    backText: { ...typography.bodyStrong, color: colors.white },
    heading: { alignItems: "center", gap: spacing.md, paddingTop: spacing.xxxl },
    heroIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", ...shadow },
    title: { ...typography.hero, color: colors.white, textAlign: "center" },
    subtitle: { ...typography.body, color: "rgba(255,255,255,0.84)", textAlign: "center", maxWidth: 380 },
    panel: { width: "100%", maxWidth: 480, alignSelf: "center", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg, ...shadow },
    sentRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.successSoft },
    sentCopy: { flex: 1, gap: spacing.xs },
    sentLabel: { ...typography.caption, color: colors.success },
    sentEmail: { ...typography.bodyStrong, color: colors.ink },
    error: { ...typography.caption, color: colors.danger },
});
