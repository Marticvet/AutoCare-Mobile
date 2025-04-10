import { Session } from "@supabase/supabase-js";
import {
    PropsWithChildren,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import { supabase } from "../lib/supabase";

type AuthData = {
    session: Session | null;
    profile: any;
    loading: boolean;
    logout: () => Promise<void>;
    // isAdmin: boolean;
};

const AuthContext = createContext<AuthData>({
    session: null,
    loading: true,
    profile: null,
    logout: async () => {},
    // isAdmin: false,
});

export const AuthProvider = ({ children }: PropsWithChildren) => {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // ✅ Define `fetchProfile` before using it
    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (error) {
            console.error("🚨 Error fetching profile:", error);
            setProfile(null);
        } else {
            setProfile(data);
        }
    };

    useEffect(() => {
        const fetchSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            setSession(session);
            if (session && session.user.id) {
                await fetchProfile(session.user.id);
            }
            setLoading(false);
        };

        fetchSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                if (session && session.user.id) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                    setSession(null);
                }
            }
        );

        return () => authListener.subscription.unsubscribe();
    }, []);

    // ✅ Logout function inside AuthProvider
    const logout = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            setSession(null);
            return;
        }

        // ✅ Reset auth state
        setSession(null);
        setProfile(null);

        // ✅ Reset navigation stack to Login screen

        console.log("✅ Successfully logged out!");

        // Place the token refresher hook here so it runs when session changes
        useTokenRefresher(session, logout);
    };

    return (
        <AuthContext.Provider
            value={{
                session,
                profile,
                loading,
                logout, // ✅ Expose logout function
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

import jwtDecode from "jwt-decode";

const useTokenRefresher = (session: any, logout: () => Promise<void>) => {
    useEffect(() => {
        const checkTokenExpiration = async () => {
            if (session?.access_token) {
                try {
                    // @ts-ignore
                    const decoded: any = jwtDecode(session.access_token);
                    const currentTime = Math.floor(Date.now() / 1000);
                    // If token is going to expire within 5 minutes, refresh it
                    if (decoded.exp - currentTime < 60) {
                        // Call getSession() to trigger auto-refresh, or perform your logic here
                        await supabase.auth.getSession();
                    }
                } catch (error) {
                    logout();
                    console.log("Error decoding token:", error);
                }
            }
        };

        // Check every minute
        const interval = setInterval(checkTokenExpiration, 60 * 1000);

        return () => clearInterval(interval);
    }, [session, logout]);
};

export const useAuth = () => useContext(AuthContext);
