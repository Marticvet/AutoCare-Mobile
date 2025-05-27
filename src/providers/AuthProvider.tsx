import { Session } from "@supabase/supabase-js";
import {
    PropsWithChildren,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import { supabase } from "../lib/supabase";
import { jwtDecode } from "jwt-decode";
import * as SecureStore from "expo-secure-store";

type AuthData = {
    session: Session | null;
    profile: any;
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
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile from Supabase 'profiles' table
    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (error) {
            console.warn("Error fetching profile:", error);
            setProfile(null);
        } else {
            setProfile(data);
        }
    };

    // Restore session on app load
    useEffect(() => {
        const restoreSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            // Optionally load from secure storage if session is null
            if (!session) {
                const saved = await SecureStore.getItemAsync("session");
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const { data: restoredSession, error } =
                        await supabase.auth.setSession(parsed);
                    if (error) {
                        console.warn("Error restoring session:", error);
                    } else {
                        setSession(restoredSession.session);
                        if (restoredSession.session?.user?.id) {
                            await fetchProfile(restoredSession.session.user.id);
                        }
                    }
                }
            } else {
                setSession(session);
                if (session.user.id) {
                    await fetchProfile(session.user.id);
                }
            }

            setLoading(false);
        };

        restoreSession();

        // Listen for auth state changes (login, logout, refresh)
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                if (session && session.user.id) {
                    await fetchProfile(session.user.id);
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

    // Token refresh hook
    useTokenRefresher(session, async () => {
        await logout();
    });

    // Logout and cleanup
    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.warn("Logout error:", error);
        }
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

// Hook to auto-refresh access token based on expiration time
const useTokenRefresher = (
    session: Session | null,
    logout: () => Promise<void>
) => {
    useEffect(() => {
        const checkTokenExpiration = async () => {
            if (session?.access_token) {
                try {
                    const decoded: any = jwtDecode(session.access_token);
                    const currentTime = Math.floor(Date.now() / 1000);
                    // Refresh if token expires in less than 1 minute
                    if (decoded.exp - currentTime < 60) {
                        await supabase.auth.getSession();
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
