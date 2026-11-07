type SocialAuthExtra = {
    release?: { environment?: string };
    socialAuth?: {
        enabled?: boolean;
        googleEnabled?: boolean;
        appleEnabled?: boolean;
    };
};

type PublicSocialAuthEnvironment = {
    EXPO_PUBLIC_APP_ENV?: string;
    EXPO_PUBLIC_ENABLE_SOCIAL_AUTH?: string;
    EXPO_PUBLIC_ENABLE_GOOGLE_AUTH?: string;
    EXPO_PUBLIC_ENABLE_APPLE_AUTH?: string;
};

export type SocialAuthConfiguration = {
    googleEnabled: boolean;
    appleEnabled: boolean;
};

const disabled: SocialAuthConfiguration = { googleEnabled: false, appleEnabled: false };

// Expo replaces literal EXPO_PUBLIC_* references while it transforms the Metro
// bundle. Do not pass process.env through a helper parameter here: React Native
// does not provide a Node process environment at runtime.
const metroPublicEnvironment: PublicSocialAuthEnvironment = {
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_ENABLE_SOCIAL_AUTH: process.env.EXPO_PUBLIC_ENABLE_SOCIAL_AUTH,
    EXPO_PUBLIC_ENABLE_GOOGLE_AUTH: process.env.EXPO_PUBLIC_ENABLE_GOOGLE_AUTH,
    EXPO_PUBLIC_ENABLE_APPLE_AUTH: process.env.EXPO_PUBLIC_ENABLE_APPLE_AUTH,
};

function isTrue(value: string | undefined) {
    return value === "true";
}

/**
 * Uses the embedded Expo config in normal builds. A Debug app served by Metro
 * may have an older EXConstants resource because Xcode does not track `.env`
 * as an input of that Pods resource script; in that development-only case,
 * Expo's inlined public flags are the current source of truth.
 */
export function getSocialAuthConfiguration(
    extra: SocialAuthExtra | undefined,
    environment: PublicSocialAuthEnvironment = metroPublicEnvironment
): SocialAuthConfiguration {
    const embeddedEnvironment = extra?.release?.environment;
    // Never permit Metro/public environment values to turn providers on in a
    // local Release, preview, or production application.
    if (embeddedEnvironment === "local-release" || embeddedEnvironment === "preview" || embeddedEnvironment === "production") {
        return disabled;
    }

    const hasMetroFlags = [
        environment.EXPO_PUBLIC_APP_ENV,
        environment.EXPO_PUBLIC_ENABLE_SOCIAL_AUTH,
        environment.EXPO_PUBLIC_ENABLE_GOOGLE_AUTH,
        environment.EXPO_PUBLIC_ENABLE_APPLE_AUTH,
    ].some((value) => value !== undefined);

    if (hasMetroFlags) {
        const socialEnvironment = environment.EXPO_PUBLIC_APP_ENV;
        if ((socialEnvironment !== "development" && socialEnvironment !== "testflight") || !isTrue(environment.EXPO_PUBLIC_ENABLE_SOCIAL_AUTH)) {
            return disabled;
        }
        return {
            googleEnabled: isTrue(environment.EXPO_PUBLIC_ENABLE_GOOGLE_AUTH),
            appleEnabled: isTrue(environment.EXPO_PUBLIC_ENABLE_APPLE_AUTH),
        };
    }

    return {
        googleEnabled: extra?.socialAuth?.googleEnabled === true,
        appleEnabled: extra?.socialAuth?.appleEnabled === true,
    };
}
