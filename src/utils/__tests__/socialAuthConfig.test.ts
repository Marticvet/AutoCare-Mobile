import { getSocialAuthConfiguration } from "../socialAuthConfig";

describe("social-auth runtime configuration", () => {
    it("uses current Metro development flags when the embedded simulator manifest is stale and disabled", () => {
        expect(getSocialAuthConfiguration(
            { release: { environment: "development" }, socialAuth: { enabled: false } },
            {
                EXPO_PUBLIC_APP_ENV: "development",
                EXPO_PUBLIC_ENABLE_SOCIAL_AUTH: "true",
                EXPO_PUBLIC_ENABLE_GOOGLE_AUTH: "true",
                EXPO_PUBLIC_ENABLE_APPLE_AUTH: "false",
            }
        )).toEqual({ googleEnabled: true, appleEnabled: false });
    });

    it.each(["local-release", "preview", "production"])("keeps providers off for %s even when public flags are true", (buildEnvironment) => {
        expect(getSocialAuthConfiguration(
            { release: { environment: buildEnvironment } },
            {
                EXPO_PUBLIC_APP_ENV: "development",
                EXPO_PUBLIC_ENABLE_SOCIAL_AUTH: "true",
                EXPO_PUBLIC_ENABLE_GOOGLE_AUTH: "true",
                EXPO_PUBLIC_ENABLE_APPLE_AUTH: "true",
            }
        )).toEqual({ googleEnabled: false, appleEnabled: false });
    });

    it("uses the embedded provider settings when Metro has no public flags", () => {
        expect(getSocialAuthConfiguration({
            release: { environment: "development" },
            socialAuth: { enabled: true, googleEnabled: true, appleEnabled: false },
        }, {})).toEqual({ googleEnabled: true, appleEnabled: false });
    });

    it("permits explicitly enabled providers in the separate TestFlight environment", () => {
        expect(getSocialAuthConfiguration(
            { release: { environment: "testflight" }, socialAuth: { enabled: true, googleEnabled: true, appleEnabled: true } },
            {
                EXPO_PUBLIC_APP_ENV: "testflight",
                EXPO_PUBLIC_ENABLE_SOCIAL_AUTH: "true",
                EXPO_PUBLIC_ENABLE_GOOGLE_AUTH: "true",
                EXPO_PUBLIC_ENABLE_APPLE_AUTH: "true",
            }
        )).toEqual({ googleEnabled: true, appleEnabled: true });
    });
});
