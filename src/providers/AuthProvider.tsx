// import { Session } from "@supabase/supabase-js";
// import {
//     PropsWithChildren,
//     createContext,
//     useContext,
//     useEffect,
//     useState,
// } from "react";
// import { supabase } from "../lib/supabase";
// import { jwtDecode } from "jwt-decode";
// import * as SecureStore from "expo-secure-store";

// type AuthData = {
//     session: Session | null;
//     profile: any;
//     loading: boolean;
//     logout: () => Promise<void>;
//     isAuthenticated: boolean;
// };

// const AuthContext = createContext<AuthData>({
//     session: null,
//     profile: null,
//     loading: true,
//     logout: async () => {},
//     isAuthenticated: false,
// });

// import { AppState } from "react-native";
// import { useSystem } from "../powersync/PowerSync";

// export const AuthProvider = ({ children }: PropsWithChildren) => {
//     const { supabaseConnector } = useSystem();

//     const [session, setSession] = useState<Session | null>(null);
//     const [profile, setProfile] = useState<any>(null);
//     const [loading, setLoading] = useState(true);

//     // make sure you register this only once!
//     AppState.addEventListener("change", (state) => {
//         console.log(state === "active", `state === 'active'`);

//         if (state === "active") {
//             supabase.auth.startAutoRefresh();
//         } else {
//             supabase.auth.stopAutoRefresh();
//         }
//     });

//     // Fetch user profile from Supabase 'profiles' table
//     const fetchProfile = async (userId: string) => {
//         // const { data, error } = await supabaseConnector
//         //     .from("profiles")
//         //     .select("*")
//         //     .eq("id", userId)
//         //     .single();

//         // if (error) {
//         //     console.warn("Error fetching profile:", error);
//         //     setProfile(null);
//         // } else {
//         //     setProfile(data);
//         // }
//     };

//     // Restore session on app load
//     useEffect(() => {
//         const restoreSession = async () => {
//             const {
//                 data: { session },
//             } = await supabaseConnector.client.auth.getSession();

//             // Optionally load from secure storage if session is null
//             if (!session) {
//                 const saved = await SecureStore.getItemAsync("session");
//                 if (saved) {
//                     const parsed = JSON.parse(saved);
//                     const { data: restoredSession, error } =
//                         await supabaseConnector.client.auth.setSession(parsed);
//                     if (error) {
//                         console.warn("Error restoring session:", error);
//                     } else {
//                         setSession(restoredSession.session);
//                         if (restoredSession.session?.user?.id) {
//                             await fetchProfile(restoredSession.session.user.id);
//                         }
//                     }
//                 }
//             } else {
//                 setSession(session);
//                 if (session.user.id) {
//                     await fetchProfile(session.user.id);
//                 }
//             }

//             setLoading(false);
//         };

//         restoreSession();

//         // Listen for auth state changes (login, logout, refresh)
//         const { data: authListener } = supabase.auth.onAuthStateChange(
//             async (_event, session) => {
//                 setSession(session);
//                 if (session && session.user.id) {
//                     await fetchProfile(session.user.id);
//                     await SecureStore.setItemAsync(
//                         "session",
//                         JSON.stringify(session)
//                     );
//                 } else {
//                     setProfile(null);
//                     setSession(null);
//                     await SecureStore.deleteItemAsync("session");
//                 }
//             }
//         );

//         return () => {
//             authListener.subscription.unsubscribe();
//         };
//     }, []);

//     // Token refresh hook
//     useTokenRefresher(session, async () => {
//         await logout();
//     });

//     // Logout and cleanup
//     const logout = async () => {
//         const { error } = await supabaseConnector.client.auth.signOut();
//         if (error) {
//             console.warn("Logout error:", error);
//         }
//         setSession(null);
//         setProfile(null);
//         await SecureStore.deleteItemAsync("session");
//     };

//     return (
//         <AuthContext.Provider
//             value={{
//                 session,
//                 profile,
//                 loading,
//                 logout,
//                 isAuthenticated: !!session,
//             }}
//         >
//             {children}
//         </AuthContext.Provider>
//     );
// };

// // Hook to auto-refresh access token based on expiration time
// const useTokenRefresher = (
//     session: Session | null,
//     logout: () => Promise<void>
// ) => {
//     useEffect(() => {
//         const checkTokenExpiration = async () => {
//             if (session?.access_token) {
//                 try {
//                     const decoded: any = jwtDecode(session.access_token);
//                     const currentTime = Math.floor(Date.now() / 1000);
//                     // Refresh if token expires in less than 1 minute
//                     if (decoded.exp - currentTime < 60) {
//                         await supabase.auth.getSession();
//                     }
//                 } catch (error) {
//                     console.warn("Error decoding token:", error);
//                     await logout();
//                 }
//             }
//         };

//         const interval = setInterval(checkTokenExpiration, 60 * 1000);

//         return () => clearInterval(interval);
//     }, [session, logout]);
// };

// export const useAuth = () => useContext(AuthContext);

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

import { useSystem } from "../powersync/PowerSync";

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
    const system = useSystem();
    const supabase = system.supabaseConnector.client;

    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const listener = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                supabase.auth.startAutoRefresh();
            } else {
                supabase.auth.stopAutoRefresh();
            }
        });

        return () => listener.remove();
    }, [supabase]);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();
            if (error) throw error;
            setProfile(data);
        } catch (e) {
            console.warn("Error fetching profile:", e);
            setProfile(null);
        }
    };

    const restoreSession = async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            const saved = await SecureStore.getItemAsync("session");
            if (saved) {
                const parsed = JSON.parse(saved);
                const { data: restoredSession, error } =
                    await supabase.auth.setSession(parsed);
                if (!error) {
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

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.warn("Logout error:", error);
        }
        setSession(null);
        setProfile(null);
        await SecureStore.deleteItemAsync("session");
    };

    useEffect(() => {
        restoreSession();

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

    useTokenRefresher(session, logout);

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

export const useAuth = () => useContext(AuthContext);

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
                    if (decoded.exp - currentTime < 60) {
                        // Trigger refresh
                        await logout(); // Or you can call getSession here if you prefer to re-fetch
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
