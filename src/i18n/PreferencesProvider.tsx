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
import { Appearance, useColorScheme } from "react-native";
import { TranslationKey, translations } from "./translations";
import { Language, localeForLanguage } from "./languages";
import { AppearancePreference, isAppearancePreference, resolveAppearance } from "../theme/appearance";

export { languageOptions } from "./languages";
export type { Language } from "./languages";
export type Currency = "EUR" | "USD" | "GBP" | "BGN" | "CHF" | "PLN" | "RON" | "CZK" | "HUF" | "SEK" | "NOK" | "DKK" | "CAD" | "AUD" | "JPY";
export type DistanceUnit = "km" | "mi";
export type { AppearancePreference } from "../theme/appearance";

type Preferences = {
    language: Language;
    currency: Currency;
    distanceUnit: DistanceUnit;
    appearance: AppearancePreference;
};

type PreferencesContextValue = Preferences & {
    ready: boolean;
    locale: string;
    setLanguage: (language: Language) => void;
    setCurrency: (currency: Currency) => void;
    setDistanceUnit: (unit: DistanceUnit) => void;
    setAppearance: (appearance: AppearancePreference) => void;
    resolvedAppearance: "light" | "dark";
    t: (key: TranslationKey, params?: TranslationParams) => string;
    formatCurrency: (value: number) => string;
    formatDistance: (kilometers: number) => string;
    formatNumber: (value: number, maximumFractionDigits?: number) => string;
    formatDate: (value: string | Date) => string;
    formatDateTime: (value: string | Date) => string;
};

type TranslationParams = Record<string, string | number>;

function interpolate(template: string, params?: TranslationParams) {
    if (!params) return template;
    return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key: string) =>
        Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
    );
}

const STORAGE_KEY = "@autocare/preferences/v1";
const defaults: Preferences = { language: "en", currency: "EUR", distanceUnit: "km", appearance: "system" };

const PreferencesContext = createContext<PreferencesContextValue>({
    ...defaults,
    ready: false,
    locale: "en-US",
    setLanguage: () => undefined,
    setCurrency: () => undefined,
    setDistanceUnit: () => undefined,
    setAppearance: () => undefined,
    resolvedAppearance: "light",
    t: (key, params) => interpolate(translations.en[key], params),
    formatCurrency: (value) => `${value.toFixed(2)} EUR`,
    formatDistance: (value) => `${Math.round(value)} km`,
    formatNumber: (value) => String(value),
    formatDate: (value) => String(value),
    formatDateTime: (value) => String(value),
});

export function PreferencesProvider({ children }: PropsWithChildren) {
    const systemAppearance = useColorScheme();
    const [preferences, setPreferences] = useState(defaults);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((saved) => {
                if (saved) {
                    const parsed = JSON.parse(saved) as Partial<Preferences>;
                    setPreferences((current) => ({
                        ...current,
                        ...parsed,
                        appearance: isAppearancePreference(parsed.appearance)
                            ? parsed.appearance
                            : current.appearance,
                    }));
                }
            })
            .catch(() => undefined)
            .finally(() => setReady(true));
    }, []);

    const update = useCallback((patch: Partial<Preferences>) => {
        setPreferences((current) => {
            const next = { ...current, ...patch };
            void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    useEffect(() => {
        Appearance.setColorScheme(preferences.appearance === "system" ? null : preferences.appearance);
    }, [preferences.appearance]);

    const value = useMemo<PreferencesContextValue>(() => {
        const locale = localeForLanguage(preferences.language);
        return {
            ...preferences,
            ready,
            locale,
            setLanguage: (language) => update({ language }),
            setCurrency: (currency) => update({ currency }),
            setDistanceUnit: (distanceUnit) => update({ distanceUnit }),
            setAppearance: (appearance) => update({ appearance }),
            resolvedAppearance: resolveAppearance(preferences.appearance, systemAppearance),
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
            formatNumber: (number, maximumFractionDigits = 2) =>
                new Intl.NumberFormat(locale, { maximumFractionDigits }).format(Number.isFinite(number) ? number : 0),
            formatDate: (input) => {
                const date = input instanceof Date
                    ? input
                    : /^\d{4}-\d{2}-\d{2}$/.test(input)
                        ? new Date(`${input}T12:00:00`)
                        : new Date(input);
                return Number.isNaN(date.getTime()) ? String(input) : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
            },
            formatDateTime: (input) => {
                const date = input instanceof Date ? input : new Date(input);
                return Number.isNaN(date.getTime()) ? String(input) : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
            },
        };
    }, [preferences, ready, systemAppearance, update]);

    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export const usePreferences = () => useContext(PreferencesContext);
