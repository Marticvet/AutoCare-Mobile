import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/ui";
import { usePreferences } from "../i18n/PreferencesProvider";
import { colors, radius, spacing, typography } from "../theme/tokens";

export default function OnboardingScreen({ onComplete }: { onComplete: () => Promise<void> | void }) {
    const { t } = usePreferences();
    const { width } = useWindowDimensions();
    const [index, setIndex] = useState(0);
    const [busy, setBusy] = useState(false);
    const slides = useMemo(() => [
        { icon: "car-sport-outline", title: t("onboardingGarageTitle"), body: t("onboardingGarageBody") },
        { icon: "pie-chart-outline", title: t("onboardingCostsTitle"), body: t("onboardingCostsBody") },
        { icon: "notifications-outline", title: t("onboardingMaintenanceTitle"), body: t("onboardingMaintenanceBody") },
    ], [t]);
    const last = index === slides.length - 1;

    const finish = async () => {
        setBusy(true);
        try {
            await onComplete();
        } finally {
            setBusy(false);
        }
    };

    const slide = slides[index];
    return (
        <LinearGradient colors={["#16274B", "#2F6BFF"]} style={styles.flex}>
            <SafeAreaView style={styles.flex}>
                <View style={[styles.content, width >= 768 && styles.contentTablet]}>
                    <View style={styles.topRow}>
                        <Text style={styles.brand}>{t("appName")}</Text>
                        {!last ? (
                            <Pressable onPress={() => void finish()} accessibilityRole="button" hitSlop={10}>
                                <Text style={styles.skip}>{t("skip")}</Text>
                            </Pressable>
                        ) : <View style={styles.skipSpacer} />}
                    </View>

                    <View style={styles.presentation} accessibilityLiveRegion="polite">
                        <View style={styles.illustration}>
                            <View style={styles.illustrationHalo} />
                            <Ionicons name={slide.icon as never} size={82} color={colors.white} />
                        </View>
                        <Text style={styles.title}>{slide.title}</Text>
                        <Text style={styles.body}>{slide.body}</Text>
                    </View>

                    <View style={styles.footer}>
                        <View style={styles.progress} accessibilityLabel={`${index + 1} / ${slides.length}`}>
                            {slides.map((_, dot) => <View key={dot} style={[styles.dot, dot === index && styles.dotActive]} />)}
                        </View>
                        <View style={styles.actions}>
                            {index > 0 ? <Button label={t("back")} variant="ghost" onPress={() => setIndex((value) => value - 1)} /> : <View style={styles.actionPlaceholder} />}
                            <View style={styles.primaryAction}>
                                <Button
                                    label={last ? t("getStarted") : t("next")}
                                    icon={last ? "checkmark" : "arrow-forward"}
                                    loading={busy}
                                    onPress={() => last ? void finish() : setIndex((value) => value + 1)}
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    content: { flex: 1, width: "100%", maxWidth: 620, alignSelf: "center", padding: spacing.xl, justifyContent: "space-between" },
    contentTablet: { paddingVertical: spacing.xxl * 1.4 },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48 },
    brand: { ...typography.heading, color: colors.white },
    skip: { ...typography.bodyStrong, color: colors.white, padding: spacing.sm },
    skipSpacer: { width: 64 },
    presentation: { alignItems: "center", gap: spacing.lg },
    illustration: { width: 180, height: 180, borderRadius: 56, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden" },
    illustrationHalo: { position: "absolute", width: 126, height: 126, borderRadius: 63, backgroundColor: "rgba(255,255,255,0.10)" },
    title: { ...typography.hero, color: colors.white, textAlign: "center", maxWidth: 520 },
    body: { ...typography.body, color: "rgba(255,255,255,0.84)", textAlign: "center", maxWidth: 490, lineHeight: 24 },
    footer: { gap: spacing.xl },
    progress: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.35)" },
    dotActive: { width: 28, backgroundColor: colors.white },
    actions: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.sm },
    actionPlaceholder: { flex: 1 },
    primaryAction: { flex: 1 },
});
