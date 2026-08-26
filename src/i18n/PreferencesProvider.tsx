import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    PropsWithChildren,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { TranslationKey, translations } from "./translations";

export type Language = "en" | "de" | "bg" | "es" | "fr";
export type Currency = "EUR" | "USD" | "GBP" | "BGN" | "CHF" | "PLN" | "RON" | "CZK" | "HUF" | "SEK" | "NOK" | "DKK" | "CAD" | "AUD" | "JPY";
export type DistanceUnit = "km" | "mi";

type Preferences = {
    language: Language;
    currency: Currency;
    distanceUnit: DistanceUnit;
};

type PreferencesContextValue = Preferences & {
    ready: boolean;
    setLanguage: (language: Language) => void;
    setCurrency: (currency: Currency) => void;
    setDistanceUnit: (unit: DistanceUnit) => void;
    t: (key: TranslationKey) => string;
    formatCurrency: (value: number) => string;
    formatDistance: (kilometers: number) => string;
};

const STORAGE_KEY = "@autocare/preferences/v1";
const defaults: Preferences = { language: "en", currency: "EUR", distanceUnit: "km" };

const PreferencesContext = createContext<PreferencesContextValue>({
    ...defaults,
    ready: false,
    setLanguage: () => undefined,
    setCurrency: () => undefined,
    setDistanceUnit: () => undefined,
    t: (key) => translations.en[key],
    formatCurrency: (value) => `${value.toFixed(2)} EUR`,
    formatDistance: (value) => `${Math.round(value)} km`,
});

export function PreferencesProvider({ children }: PropsWithChildren) {
    const [preferences, setPreferences] = useState(defaults);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((saved) => {
                if (saved) {
                    setPreferences((current) => ({ ...current, ...JSON.parse(saved) }));
                }
            })
            .finally(() => setReady(true));
    }, []);

    const update = useCallback((patch: Partial<Preferences>) => {
        setPreferences((current) => {
            const next = { ...current, ...patch };
            void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const value = useMemo<PreferencesContextValue>(() => {
        const locale = {
            en: "en-US",
            de: "de-DE",
            bg: "bg-BG",
            es: "es-ES",
            fr: "fr-FR",
        }[preferences.language];
        return {
            ...preferences,
            ready,
            setLanguage: (language) => update({ language }),
            setCurrency: (currency) => update({ currency }),
            setDistanceUnit: (distanceUnit) => update({ distanceUnit }),
            t: (key) => translations[preferences.language][key],
            formatCurrency: (value) =>
                new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: preferences.currency,
                    maximumFractionDigits: 2,
                }).format(Number.isFinite(value) ? value : 0),
            formatDistance: (kilometers) => {
                const value = preferences.distanceUnit === "mi" ? kilometers * 0.621371 : kilometers;
                return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)} ${preferences.distanceUnit}`;
            },
        };
    }, [preferences, ready, update]);

    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export const usePreferences = () => useContext(PreferencesContext);
