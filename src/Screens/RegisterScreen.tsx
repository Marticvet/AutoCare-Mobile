import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, FormField } from "../components/ui";
import { usePreferences } from "../i18n/PreferencesProvider";
import { useAuth } from "../providers/AuthProvider";
import { colors, radius, spacing, typography } from "../theme/tokens";

export default function RegisterScreen({ navigation }: any) {
    const { signUp } = useAuth();
    const { t } = usePreferences();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!fullName.trim() || !email.includes("@") || password.length < 8) {
            Alert.alert(t("signUp"), t("requiredFields"));
            return;
        }
        if (password !== confirmation) {
            Alert.alert(t("signUp"), t("passwordsMismatch"));
            return;
        }
        setBusy(true);
        try {
            const result = await signUp({ email, password, fullName });
            if (result.needsVerification) {
                Alert.alert(t("signUp"), t("verifyEmail"), [
                    { text: t("done"), onPress: () => navigation.navigate("Login") },
                ]);
            }
        } catch (error) {
            Alert.alert(t("signUp"), (error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <LinearGradient colors={["#16274B", "#2F6BFF"]} style={styles.flex}>
            <SafeAreaView style={styles.flex}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
                    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                        <View style={styles.panel}>
                            <Text style={styles.title}>{t("signUp")}</Text>
                            <Text style={styles.subtitle}>{t("authWelcome")}</Text>
                            <FormField label={t("fullName")} value={fullName} onChangeText={setFullName} autoComplete="name" required />
                            <FormField label={t("email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" required />
                            <FormField label={t("password")} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" hint="8+ characters" required />
                            <FormField label={t("confirmPassword")} value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" required />
                            <Button label={t("signUp")} onPress={submit} loading={busy} />
                            <View style={styles.inline}>
                                <Text style={styles.subtitle}>{t("haveAccount")}</Text>
                                <Pressable onPress={() => navigation.navigate("Login")}>
                                    <Text style={styles.link}>{t("signIn")}</Text>
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
    content: { flexGrow: 1, justifyContent: "center", padding: spacing.xl },
    panel: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg },
    title: { ...typography.title, color: colors.ink },
    subtitle: { ...typography.body, color: colors.inkMuted },
    link: { ...typography.label, color: colors.primary },
    inline: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: spacing.sm },
});
