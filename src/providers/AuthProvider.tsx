import { Session } from "@supabase/supabase-js";
import React, {
    PropsWithChildren,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { AppState, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Profile } from "../powersync/AppSchema";
import { useSystem } from "../powersync/PowerSync";
import { signOutAndClearOfflineData } from "../utils/offlineSession";
import {
    EMPTY_PROFILE_NAME_FILTER,
    appleFirstLoginProfileNamePatch,
} from "../utils/appleProfile";
import { parsePasswordRecoveryLink, passwordRecoveryCallbackKey } from "../utils/passwordRecoveryLink";
import { logRecoveryDiagnostic, passwordRecoveryErrorCategory } from "../utils/authRecoveryDiagnostics";
import {
    SOCIAL_AUTH_REDIRECT_URL,
    SocialProvider,
    exchangeSocialAuthCode,
    parseSocialAuthCallback,
    socialOAuthAuthorizationOptions,
} from "../utils/socialAuth";

type RegistrationInput = { email: string; password: string; fullName: string };
type SocialIdentityToken = { token: string; nonce?: string; accessToken?: string; fullName?: string };

type AuthData = {
    session: Session | null;
    profile: Profile | null;
    userId: string;
    loading: boolean;
    authError: string | null;
    isPasswordRecovery: boolean;
    passwordRecoveryLoading: boolean;
    passwordRecoveryError: string | null;
    isAuthenticated: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (input: RegistrationInput) => Promise<{ needsVerification: boolean }>;
    signInWithSocialProvider: (provider: SocialProvider) => Promise<{ cancelled: boolean }>;
    signInWithAppleIdentity: (identity: SocialIdentityToken) => Promise<void>;
    linkSocialIdentity: (provider: SocialProvider) => Promise<{ cancelled: boolean }>;
    linkAppleIdentity: (identity: SocialIdentityToken) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    completePasswordRecovery: (newPassword: string) => Promise<void>;
    cancelPasswordRecovery: () => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthData>({
    session: null,
    profile: null,
    userId: "",
    loading: true,
    authError: null,
    isPasswordRecovery: false,
    passwordRecoveryLoading: false,
    passwordRecoveryError: null,
    isAuthenticated: false,
    signIn: async () => undefined,
    signUp: async () => ({ needsVerification: false }),
    signInWithSocialProvider: async () => ({ cancelled: false }),
    signInWithAppleIdentity: async () => undefined,
    linkSocialIdentity: async () => ({ cancelled: false }),
    linkAppleIdentity: async () => undefined,
    resetPassword: async () => undefined,
    completePasswordRecovery: async () => undefined,
    cancelPasswordRecovery: async () => undefined,
    changePassword: async () => undefined,
    logout: async () => undefined,
    refreshProfile: async () => undefined,
});

export function AuthProvider({ children }: PropsWithChildren) {
    const system = useSystem();
    const { supabaseConnector, powersync, db } = system;
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
    const [passwordRecoveryLoading, setPasswordRecoveryLoading] = useState(false);
    const [passwordRecoveryError, setPasswordRecoveryError] = useState<string | null>(null);
    const consumedAuthCodes = useRef(new Set<string>());
    const processingAuthCodes = useRef(new Set<string>());
    const consumedRecoveryCallbacks = useRef(new Set<string>());
    const processingRecoveryCallbacks = useRef(new Set<string>());
    const userId = session?.user.id ?? "";

    const clearUnauthenticatedLocalState = useCallback(async () => {
        try {
            await signOutAndClearOfflineData(
                () => supabaseConnector.client.auth.signOut({ scope: "local" }),
                () => powersync.disconnectAndClear()
            );
        } finally {
            setSession(null);
            setProfile(null);
        }
    }, [powersync, supabaseConnector]);

    const consumePasswordRecoveryUrl = useCallback(
        async (url: string, source: "initial_url" | "link_event") => {
            const recovery = parsePasswordRecoveryLink(url);
            if (recovery.kind === "ignore") return false;

            const callbackKey = passwordRecoveryCallbackKey(recovery);
            logRecoveryDiagnostic("callback_received", {
                source,
                kind: recovery.kind,
                hasCallbackCredential: Boolean(callbackKey),
            });
            if (callbackKey && (
                consumedRecoveryCallbacks.current.has(callbackKey) ||
                processingRecoveryCallbacks.current.has(callbackKey)
            )) {
                logRecoveryDiagnostic("callback_ignored_duplicate", { source, kind: recovery.kind });
                return true;
            }

            setIsPasswordRecovery(true);
            setPasswordRecoveryError(null);

            if (recovery.kind === "error") {
                logRecoveryDiagnostic("callback_rejected_by_auth_server", { source });
                setPasswordRecoveryError(recovery.message);
                return true;
            }

            if (!callbackKey) {
                setPasswordRecoveryError("password_recovery_callback_missing");
                return true;
            }

            processingRecoveryCallbacks.current.add(callbackKey);
            setPasswordRecoveryLoading(true);
            try {
                logRecoveryDiagnostic("callback_exchange_started", { source, kind: recovery.kind });
                const result = recovery.kind === "session"
                    ? await supabaseConnector.client.auth.setSession({
                        access_token: recovery.accessToken,
                        refresh_token: recovery.refreshToken,
                    })
                    : recovery.kind === "code"
                        ? await supabaseConnector.client.auth.exchangeCodeForSession(recovery.code)
                        : await supabaseConnector.client.auth.verifyOtp({
                            token_hash: recovery.tokenHash,
                            type: "recovery",
                        });

                if (result.error) throw result.error;
                if (!result.data.session) throw new Error("password_recovery_session_missing");
                consumedRecoveryCallbacks.current.add(callbackKey);
                logRecoveryDiagnostic("callback_exchange_succeeded", { source, kind: recovery.kind });
                setSession(result.data.session);
                return true;
            } catch (error) {
                consumedRecoveryCallbacks.current.add(callbackKey);
                logRecoveryDiagnostic("callback_exchange_failed", {
                    source,
                    kind: recovery.kind,
                    category: passwordRecoveryErrorCategory(error),
                });
                setPasswordRecoveryError((error as Error).message);
                return true;
            } finally {
                processingRecoveryCallbacks.current.delete(callbackKey);
                setPasswordRecoveryLoading(false);
            }
        },
        [supabaseConnector]
    );

    const completeSocialAuthCode = useCallback(async (code: string) => {
        if (consumedAuthCodes.current.has(code) || processingAuthCodes.current.has(code)) return null;

        processingAuthCodes.current.add(code);
        try {
            const exchange = await exchangeSocialAuthCode(
                code,
                (authorizationCode) => supabaseConnector.client.auth.exchangeCodeForSession(authorizationCode)
            );
            if (exchange.kind === "failure") {
                setAuthError("social_auth_callback_failed");
                return null;
            }

            consumedAuthCodes.current.add(code);
            setSession(exchange.session);
            void system.connect().catch(() => undefined);
            return exchange.session;
        } finally {
            processingAuthCodes.current.delete(code);
        }
    }, [supabaseConnector, system]);

    const consumeAuthCallbackUrl = useCallback(async (url: string) => {
        const callback = parseSocialAuthCallback(url);
        if (callback.kind === "ignore") return false;
        if (callback.kind === "cancelled") return true;
        if (callback.kind === "error") {
            // Provider errors can contain implementation-specific details. Keep
            // the app in its current state and present one localized retry path.
            setAuthError("social_auth_callback_failed");
            return true;
        }

        await completeSocialAuthCode(callback.code);
        return true;
    }, [completeSocialAuthCode]);

    const refreshProfile = useCallback(async () => {
        if (!userId) {
            setProfile(null);
            return;
        }
        const row = await db.selectFrom("profiles").selectAll().where("id", "=", userId).executeTakeFirst();
        setProfile(row ?? null);
    }, [db, userId]);

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") supabaseConnector.client.auth.startAutoRefresh();
            else supabaseConnector.client.auth.stopAutoRefresh();
        });
        return () => subscription.remove();
    }, [supabaseConnector]);

    useEffect(() => {
        const subscription = Linking.addEventListener("url", ({ url }) => {
            void consumePasswordRecoveryUrl(url, "link_event").then((handled) => {
                if (!handled) void consumeAuthCallbackUrl(url);
            });
        });
        return () => subscription.remove();
    }, [consumeAuthCallbackUrl, consumePasswordRecoveryUrl]);

    useEffect(() => {
        let mounted = true;

        void (async () => {
            try {
                await system.initDatabase();
                const initialUrl = await Linking.getInitialURL();
                if (initialUrl) {
                    const handled = await consumePasswordRecoveryUrl(initialUrl, "initial_url");
                    if (!handled) await consumeAuthCallbackUrl(initialUrl);
                }
                const { data, error } = await supabaseConnector.client.auth.getSession();
                if (error) throw error;
                logRecoveryDiagnostic("initial_session_loaded", { hasSession: Boolean(data.session) });
                if (mounted) setSession(data.session);
                if (data.session) void system.connect().catch(() => undefined);
            } catch (error) {
                if (mounted) setAuthError((error as Error).message);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        const { data: listener } = supabaseConnector.client.auth.onAuthStateChange((event, nextSession) => {
            if (!mounted) return;
            logRecoveryDiagnostic("auth_state_changed", { event, hasSession: Boolean(nextSession) });
            if (event === "PASSWORD_RECOVERY") {
                setIsPasswordRecovery(true);
                setPasswordRecoveryError(null);
            }
            setSession(nextSession);
            setAuthError(null);
            if (nextSession) {
                void system.connect().catch(() => undefined);
            } else {
                setProfile(null);
                // A remote/expired session reaches this listener without going
                // through the explicit logout callback. Clear the local store
                // here as well so another account cannot see stale rows.
                void powersync.disconnectAndClear().catch(() => undefined);
            }
        });

        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, [consumeAuthCallbackUrl, consumePasswordRecoveryUrl, powersync, system, supabaseConnector]);

    useEffect(() => {
        if (!userId) return;
        const controller = new AbortController();

        void (async () => {
            try {
                for await (const result of powersync.watch(
                    "SELECT * FROM profiles WHERE id = ? LIMIT 1",
                    [userId],
                    { signal: controller.signal }
                )) {
                    const rows = ((result.rows as any)?._array ?? []) as Profile[];
                    setProfile(rows[0] ?? null);
                }
            } catch (error) {
                if (!controller.signal.aborted) setAuthError((error as Error).message);
            }
        })();

        return () => controller.abort();
    }, [powersync, userId]);

    const signIn = useCallback(
        async (email: string, password: string) => {
            setAuthError(null);
            const { data, error } = await supabaseConnector.client.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });
            if (error) {
                setAuthError(error.message);
                throw error;
            }
            if (!data.session) {
                await clearUnauthenticatedLocalState();
                const missingSession = new Error("Email confirmation is required before you can sign in.");
                setAuthError(missingSession.message);
                throw missingSession;
            }
            setSession(data.session);
            void system.connect().catch(() => undefined);
        },
        [clearUnauthenticatedLocalState, system, supabaseConnector]
    );

    const signUp = useCallback(
        async ({ email, password, fullName }: RegistrationInput) => {
            setAuthError(null);
            const { data, error } = await supabaseConnector.client.auth.signUp({
                email: email.trim().toLowerCase(),
                password,
                options: {
                    data: { full_name: fullName.trim() },
                    emailRedirectTo: SOCIAL_AUTH_REDIRECT_URL,
                },
            });
            if (error) {
                setAuthError(error.message);
                throw error;
            }

            if (data.session && data.user) {
                setSession(data.session);
                await system.connect();
                const profileValues = {
                    id: data.user.id,
                    email: data.user.email ?? email,
                    full_name: fullName.trim(),
                    first_name: fullName.trim().split(/\s+/)[0] ?? "",
                    last_name: fullName.trim().split(/\s+/).slice(1).join(" "),
                    username: null,
                    phone_number: null,
                    phone_country_code: null,
                    avatar_url: null,
                    selected_vehicle_id: null,
                    updated_at: new Date().toISOString(),
                    account_type: "individual",
                };
                const existingProfile = await db
                    .selectFrom("profiles")
                    .select("id")
                    .where("id", "=", data.user.id)
                    .executeTakeFirst();
                if (existingProfile) {
                    const { id: _id, ...profileUpdates } = profileValues;
                    await db.updateTable("profiles").set(profileUpdates).where("id", "=", data.user.id).execute();
                } else {
                    // PowerSync tables are SQLite views: basic INSERT is supported,
                    // while SQLite's INSERT ... ON CONFLICT (UPSERT) is not.
                    await db.insertInto("profiles").values(profileValues).execute();
                }
            }

            if (!data.session) await clearUnauthenticatedLocalState();

            return { needsVerification: !data.session };
        },
        [clearUnauthenticatedLocalState, db, system, supabaseConnector]
    );

    const completeOAuthBrowserFlow = useCallback(async (provider: SocialProvider, linking: boolean) => {
        setAuthError(null);
        try {
            const auth = supabaseConnector.client.auth;
            const result = linking
                ? await auth.linkIdentity({ provider, options: socialOAuthAuthorizationOptions(provider) })
                : await auth.signInWithOAuth({ provider, options: socialOAuthAuthorizationOptions(provider) });
            if (result.error) throw result.error;
            if (!result.data.url) throw new Error("social_auth_start_missing_url");

            const browserResult = await WebBrowser.openAuthSessionAsync(result.data.url, SOCIAL_AUTH_REDIRECT_URL);
            if (browserResult.type !== "success") return { cancelled: true };

            const callback = parseSocialAuthCallback(browserResult.url);
            if (callback.kind === "cancelled") return { cancelled: true };
            if (callback.kind !== "code") throw new Error("social_auth_callback_invalid");

            const nextSession = await completeSocialAuthCode(callback.code);
            if (!nextSession) throw new Error("social_auth_callback_failed");
            return { cancelled: false };
        } catch (error) {
            setAuthError("social_auth_callback_failed");
            throw error;
        }
    }, [completeSocialAuthCode, supabaseConnector]);

    const signInWithSocialProvider = useCallback(
        (provider: SocialProvider) => completeOAuthBrowserFlow(provider, false),
        [completeOAuthBrowserFlow]
    );

    const linkSocialIdentity = useCallback(
        (provider: SocialProvider) => {
            if (!session) throw new Error("social_identity_link_requires_session");
            return completeOAuthBrowserFlow(provider, true);
        },
        [completeOAuthBrowserFlow, session]
    );

    const completeAppleIdentity = useCallback(async (identity: SocialIdentityToken, linking: boolean) => {
        setAuthError(null);
        const credentials = {
            provider: "apple" as const,
            token: identity.token,
            nonce: identity.nonce,
            access_token: identity.accessToken,
        };
        const result = linking
            ? await supabaseConnector.client.auth.linkIdentity(credentials)
            : await supabaseConnector.client.auth.signInWithIdToken(credentials);
        if (result.error) {
            setAuthError(result.error.message);
            throw result.error;
        }
        if (!("session" in result.data) || !result.data.session) throw new Error("apple_auth_session_missing");
        // Apple returns a name only on the first authorization. Persist it at
        // that point, without using a relay email as an account-merge key.
        const profileNamePatch = appleFirstLoginProfileNamePatch(identity.fullName);
        if (!linking && profileNamePatch) {
            const { error: metadataError } = await supabaseConnector.client.auth.updateUser({
                data: { full_name: profileNamePatch.full_name },
            });
            if (metadataError) throw metadataError;

            const { error: profileError } = await supabaseConnector.client
                .from("profiles")
                .update({
                    ...profileNamePatch,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", result.data.session.user.id)
                // This makes a delayed Apple first-login update safe: a name
                // the user already supplied in AutoCare always wins.
                .or(EMPTY_PROFILE_NAME_FILTER);
            if (profileError) throw profileError;
        }
        setSession(result.data.session);
        void system.connect().catch(() => undefined);
    }, [system, supabaseConnector]);

    const signInWithAppleIdentity = useCallback(
        (identity: SocialIdentityToken) => completeAppleIdentity(identity, false),
        [completeAppleIdentity]
    );

    const linkAppleIdentity = useCallback(
        (identity: SocialIdentityToken) => {
            if (!session) throw new Error("social_identity_link_requires_session");
            return completeAppleIdentity(identity, true);
        },
        [completeAppleIdentity, session]
    );

    const resetPassword = useCallback(
        async (email: string) => {
            const { error } = await supabaseConnector.client.auth.resetPasswordForEmail(
                email.trim().toLowerCase(),
                { redirectTo: "autocare://reset-password" }
            );
            if (error) throw error;
            logRecoveryDiagnostic("recovery_email_requested");
        },
        [supabaseConnector]
    );

    const completePasswordRecovery = useCallback(
        async (newPassword: string) => {
            setPasswordRecoveryError(null);
            const { error } = await supabaseConnector.client.auth.updateUser({ password: newPassword });
            if (error) {
                logRecoveryDiagnostic("password_update_failed", { category: passwordRecoveryErrorCategory(error) });
                setPasswordRecoveryError(error.message);
                throw error;
            }
            logRecoveryDiagnostic("password_update_succeeded");
            setIsPasswordRecovery(false);
            setPasswordRecoveryLoading(false);
        },
        [supabaseConnector]
    );

    const cancelPasswordRecovery = useCallback(async () => {
        try {
            await signOutAndClearOfflineData(
                () => supabaseConnector.client.auth.signOut({ scope: "local" }),
                () => powersync.disconnectAndClear()
            );
        } finally {
            setSession(null);
            setProfile(null);
            setIsPasswordRecovery(false);
            setPasswordRecoveryLoading(false);
            setPasswordRecoveryError(null);
        }
    }, [powersync, supabaseConnector]);

    const changePassword = useCallback(
        async (currentPassword: string, newPassword: string) => {
            const email = session?.user.email;
            if (!email) throw new Error("account_email_missing");

            const { error: verificationError } = await supabaseConnector.client.auth.signInWithPassword({
                email,
                password: currentPassword,
            });
            if (verificationError) throw verificationError;

            const { error } = await supabaseConnector.client.auth.updateUser({ password: newPassword });
            if (error) throw error;
        },
        [session?.user.email, supabaseConnector]
    );

    const logout = useCallback(async () => {
        setSession(null);
        setProfile(null);
        await signOutAndClearOfflineData(
            () => supabaseConnector.client.auth.signOut({ scope: "local" }),
            () => powersync.disconnectAndClear()
        );
    }, [powersync, supabaseConnector]);

    const value = useMemo<AuthData>(
        () => ({
            session,
            profile,
            userId,
            loading,
            authError,
            isPasswordRecovery,
            passwordRecoveryLoading,
            passwordRecoveryError,
            isAuthenticated: Boolean(session),
            signIn,
            signUp,
            signInWithSocialProvider,
            signInWithAppleIdentity,
            linkSocialIdentity,
            linkAppleIdentity,
            resetPassword,
            completePasswordRecovery,
            cancelPasswordRecovery,
            changePassword,
            logout,
            refreshProfile,
        }),
        [session, profile, userId, loading, authError, isPasswordRecovery, passwordRecoveryLoading, passwordRecoveryError, signIn, signUp, signInWithSocialProvider, signInWithAppleIdentity, linkSocialIdentity, linkAppleIdentity, resetPassword, completePasswordRecovery, cancelPasswordRecovery, changePassword, logout, refreshProfile]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
