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
import { Language, localeForLanguage } from "./languages";

export { languageOptions } from "./languages";
export type { Language } from "./languages";
export type Currency = "EUR" | "USD" | "GBP" | "BGN" | "CHF" | "PLN" | "RON" | "CZK" | "HUF" | "SEK" | "NOK" | "DKK" | "CAD" | "AUD" | "JPY";
export type DistanceUnit = "km" | "mi";

type Preferences = {
    language: Language;
    currency: Currency;
    distanceUnit: DistanceUnit;
};

type PreferencesContextValue = Preferences & {
    ready: boolean;
    locale: string;
    setLanguage: (language: Language) => void;
    setCurrency: (currency: Currency) => void;
    setDistanceUnit: (unit: DistanceUnit) => void;
    t: (key: TranslationKey, params?: TranslationParams) => string;
    formatCurrency: (value: number) => string;
    formatDistance: (kilometers: number) => string;
};

type TranslationParams = Record<string, string | number>;

function interpolate(template: string, params?: TranslationParams) {
    if (!params) return template;
    return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key: string) =>
        Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
    );
}

const STORAGE_KEY = "@autocare/preferences/v1";
const defaults: Preferences = { language: "en", currency: "EUR", distanceUnit: "km" };

const PreferencesContext = createContext<PreferencesContextValue>({
    ...defaults,
    ready: false,
    locale: "en-US",
    setLanguage: () => undefined,
    setCurrency: () => undefined,
    setDistanceUnit: () => undefined,
    t: (key, params) => interpolate(translations.en[key], params),
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
        const locale = localeForLanguage(preferences.language);
        return {
            ...preferences,
            ready,
            locale,
            setLanguage: (language) => update({ language }),
            setCurrency: (currency) => update({ currency }),
            setDistanceUnit: (distanceUnit) => update({ distanceUnit }),
            t: (key, params) => interpolate(translations[preferences.language][key], params),
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
