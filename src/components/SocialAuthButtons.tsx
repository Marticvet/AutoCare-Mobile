import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { Button } from "./ui";
import { usePreferences } from "../i18n/PreferencesProvider";
import { useAuth } from "../providers/AuthProvider";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { isSocialAuthCancellation } from "../utils/socialAuth";
import { getSocialAuthConfiguration } from "../utils/socialAuthConfig";

type Props = { mode?: "signIn" | "link"; showDivider?: boolean };

async function appleNonce() {
    const bytes = await Crypto.getRandomBytesAsync(32);
    const raw = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
    return { raw, hashed };
}

export function SocialAuthButtons({ mode = "signIn", showDivider = true }: Props) {
    const { t } = usePreferences();
    const {
        signInWithSocialProvider,
        signInWithAppleIdentity,
        linkSocialIdentity,
        linkAppleIdentity,
    } = useAuth();
    const [appleAvailable, setAppleAvailable] = useState(false);
    const [busy, setBusy] = useState<"apple" | "google" | null>(null);
    const { googleEnabled, appleEnabled } = getSocialAuthConfiguration(Constants.expoConfig?.extra);
    const linking = mode === "link";

    useEffect(() => {
        if (Platform.OS !== "ios" || !appleEnabled) return;
        void AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
    }, [appleEnabled]);

    const showFailure = (error: unknown) => {
        if (!isSocialAuthCancellation(error)) Alert.alert(t("socialAuthErrorTitle"), t("socialAuthFailed"));
    };

    const continueWithGoogle = async () => {
        if (!googleEnabled) return;
        setBusy("google");
        try {
            const result = linking
                ? await linkSocialIdentity("google")
                : await signInWithSocialProvider("google");
            if (!result.cancelled && linking) Alert.alert(t("signInMethods"), t("identityLinked"));
        } catch (error) {
            showFailure(error);
        } finally {
            setBusy(null);
        }
    };

    const continueWithApple = async () => {
        if (!appleEnabled || !appleAvailable) return;
        setBusy("apple");
        try {
            const nonce = await appleNonce();
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
                nonce: nonce.hashed,
            });
            if (!credential.identityToken) throw new Error("apple_identity_token_missing");

            const identity = {
                token: credential.identityToken,
                nonce: nonce.raw,
                accessToken: credential.authorizationCode ?? undefined,
                fullName: [credential.fullName?.givenName, credential.fullName?.middleName, credential.fullName?.familyName]
                    .filter((part): part is string => Boolean(part?.trim()))
                    .join(" ") || undefined,
            };
            if (linking) {
                await linkAppleIdentity(identity);
                Alert.alert(t("signInMethods"), t("identityLinked"));
            } else {
                await signInWithAppleIdentity(identity);
            }
        } catch (error) {
            showFailure(error);
        } finally {
            setBusy(null);
        }
    };

    const appleLabel = linking ? t("linkApple") : t("continueWithApple");
    const googleLabel = linking ? t("linkGoogle") : t("continueWithGoogle");

    return (
        <View style={styles.container}>
            {!linking && showDivider ? <Text style={styles.divider}>{t("orContinueWith")}</Text> : linking ? <Text style={styles.intro}>{t("linkIdentityIntro")}</Text> : null}
            {appleEnabled && appleAvailable ? (
                <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={radius.md}
                    style={styles.appleButton}
                    onPress={() => void continueWithApple()}
                    accessibilityLabel={appleLabel}
                />
            ) : appleEnabled && Platform.OS === "ios" ? (
                <Button label={appleLabel} icon="logo-apple" variant="secondary" onPress={() => undefined} disabled />
            ) : null}
            {googleEnabled ? (
                <Button label={googleLabel} icon="logo-google" variant="secondary" onPress={() => void continueWithGoogle()} loading={busy === "google"} disabled={busy === "apple"} />
            ) : null}
            {!googleEnabled && !appleEnabled ? <Text style={styles.notice}>{t("socialAuthUnavailable")}</Text> : null}
            {appleEnabled ? <Text style={styles.notice}>{t("applePrivateRelayNotice")}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: spacing.sm },
    divider: { ...typography.caption, color: colors.inkMuted, textAlign: "center", marginTop: spacing.xs },
    intro: { ...typography.caption, color: colors.inkMuted },
    appleButton: { width: "100%", height: 48 },
    notice: { ...typography.caption, color: colors.inkMuted, textAlign: "center" },
});
