import { Session } from "@supabase/supabase-js";
import React, {
    PropsWithChildren,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { AppState, Linking } from "react-native";
import { Profile } from "../powersync/AppSchema";
import { useSystem } from "../powersync/PowerSync";
import { parsePasswordRecoveryLink } from "../utils/passwordRecoveryLink";

type RegistrationInput = { email: string; password: string; fullName: string };

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
    const userId = session?.user.id ?? "";

    const consumePasswordRecoveryUrl = useCallback(
        async (url: string) => {
            const recovery = parsePasswordRecoveryLink(url);
            if (recovery.kind === "ignore") return false;

            setIsPasswordRecovery(true);
            setPasswordRecoveryError(null);

            if (recovery.kind === "error") {
                setPasswordRecoveryError(recovery.message);
                return true;
            }

            setPasswordRecoveryLoading(true);
            try {
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
                if (!result.data.session) throw new Error("The password reset session could not be created.");
                setSession(result.data.session);
                return true;
            } catch (error) {
                setPasswordRecoveryError((error as Error).message);
                return true;
            } finally {
                setPasswordRecoveryLoading(false);
            }
        },
        [supabaseConnector]
    );

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
            void consumePasswordRecoveryUrl(url);
        });
        return () => subscription.remove();
    }, [consumePasswordRecoveryUrl]);

    useEffect(() => {
        let mounted = true;

        void (async () => {
            try {
                await system.initDatabase();
                const initialUrl = await Linking.getInitialURL();
                if (initialUrl) await consumePasswordRecoveryUrl(initialUrl);
                const { data, error } = await supabaseConnector.client.auth.getSession();
                if (error) throw error;
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
            if (event === "PASSWORD_RECOVERY") {
                setIsPasswordRecovery(true);
                setPasswordRecoveryError(null);
            }
            setSession(nextSession);
            setAuthError(null);
            if (nextSession) void system.connect().catch(() => undefined);
            else setProfile(null);
        });

        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, [consumePasswordRecoveryUrl, system, supabaseConnector]);

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
            setSession(data.session);
            void system.connect().catch(() => undefined);
        },
        [system, supabaseConnector]
    );

    const signUp = useCallback(
        async ({ email, password, fullName }: RegistrationInput) => {
            setAuthError(null);
            const { data, error } = await supabaseConnector.client.auth.signUp({
                email: email.trim().toLowerCase(),
                password,
                options: { data: { full_name: fullName.trim() } },
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

            return { needsVerification: !data.session };
        },
        [db, system, supabaseConnector]
    );

    const resetPassword = useCallback(
        async (email: string) => {
            const { error } = await supabaseConnector.client.auth.resetPasswordForEmail(
                email.trim().toLowerCase(),
                { redirectTo: "autocare://reset-password" }
            );
            if (error) throw error;
        },
        [supabaseConnector]
    );

    const completePasswordRecovery = useCallback(
        async (newPassword: string) => {
            setPasswordRecoveryError(null);
            const { error } = await supabaseConnector.client.auth.updateUser({ password: newPassword });
            if (error) {
                setPasswordRecoveryError(error.message);
                throw error;
            }
            setIsPasswordRecovery(false);
            setPasswordRecoveryLoading(false);
        },
        [supabaseConnector]
    );

    const cancelPasswordRecovery = useCallback(async () => {
        try {
            await supabaseConnector.client.auth.signOut({ scope: "local" });
        } finally {
            setSession(null);
            setProfile(null);
            setIsPasswordRecovery(false);
            setPasswordRecoveryLoading(false);
            setPasswordRecoveryError(null);
        }
    }, [supabaseConnector]);

    const changePassword = useCallback(
        async (currentPassword: string, newPassword: string) => {
            const email = session?.user.email;
            if (!email) throw new Error("No email address is available for this account.");

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
        await supabaseConnector.client.auth.signOut({ scope: "local" });
        await powersync.disconnectAndClear();
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
            resetPassword,
            completePasswordRecovery,
            cancelPasswordRecovery,
            changePassword,
            logout,
            refreshProfile,
        }),
        [session, profile, userId, loading, authError, isPasswordRecovery, passwordRecoveryLoading, passwordRecoveryError, signIn, signUp, resetPassword, completePasswordRecovery, cancelPasswordRecovery, changePassword, logout, refreshProfile]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
