import { Session } from "@supabase/supabase-js";
import {
    PropsWithChildren,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import { jwtDecode } from "jwt-decode";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
import { system, useSystem } from "../powersync/PowerSync";
import { Profile } from "../powersync/AppSchema";

type AuthData = {
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
};

const AuthContext = createContext<AuthData>({
    session: null,
    profile: null,
    loading: true,
    logout: async () => {},
    isAuthenticated: false,
});

export const AuthProvider = ({ children }: PropsWithChildren) => {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const { supabaseConnector, powersync, db } = useSystem();

    AppState.addEventListener("change", (state) => {
        if (state === "active") {
            supabaseConnector.client.auth.startAutoRefresh();
        } else {
            supabaseConnector.client.auth.stopAutoRefresh();
        }
    });

    const fetchProfile = async (userId: string) => {
        const response = await db
            .selectFrom("profiles")
            .selectAll()
            .where("id", "=", userId)
            .execute();

        if (response.length === 0) {
            setProfile(null);
        } else {
            setProfile(response[0]);
        }
    };

    const restoreSession = async () => {
        const {
            data: { session },
        } = await supabaseConnector.client.auth.getSession();

        if (!session) {
            const saved = await SecureStore.getItemAsync("session");
            if (saved) {
                const parsed = JSON.parse(saved);
                const { data: restoredSession, error } =
                    await supabaseConnector.client.auth.setSession(parsed);
                if (!error && restoredSession.session) {
                    await initializeSync(restoredSession.session);
                } else {
                    console.warn("Error restoring session:", error);
                }
            }
        } else {
            await initializeSync(session);
        }

        setLoading(false);
    };

    const initializeSync = async (session: Session) => {
        setSession(session);
        await system.init();
        await powersync.waitForReady();

        await powersync.waitForFirstSync();
        await fetchProfile(session.user.id);
    };

    useEffect(() => {
        restoreSession();

        const { data: authListener } =
            supabaseConnector.client.auth.onAuthStateChange(
                async (_event, session) => {
                    if (session) {
                        await initializeSync(session);
                        await SecureStore.setItemAsync(
                            "session",
                            JSON.stringify(session)
                        );
                    } else {
                        setProfile(null);
                        setSession(null);
                        await SecureStore.deleteItemAsync("session");
                    }
                }
            );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    useTokenRefresher(session, async () => {
        await logout();
    });

    const logout = async () => {
        await powersync.disconnectAndClear();
        await supabaseConnector.client.auth.signOut();
        setSession(null);
        setProfile(null);
        await SecureStore.deleteItemAsync("session");
    };

    return (
        <AuthContext.Provider
            value={{
                session,
                profile,
                loading,
                logout,
                isAuthenticated: !!session,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

const useTokenRefresher = (
    session: Session | null,
    logout: () => Promise<void>
) => {
    const { supabaseConnector } = useSystem();

    useEffect(() => {
        const checkTokenExpiration = async () => {
            if (session?.access_token) {
                try {
                    const decoded: any = jwtDecode(session.access_token);
                    const currentTime = Math.floor(Date.now() / 1000);
                    if (decoded.exp - currentTime < 60) {
                        await supabaseConnector.client.auth.getSession();
                    }
                } catch (error) {
                    console.warn("Error decoding token:", error);
                    await logout();
                }
            }
        };

        const interval = setInterval(checkTokenExpiration, 60 * 1000);
        return () => clearInterval(interval);
    }, [session, logout]);
};

export const useAuth = () => useContext(AuthContext);
