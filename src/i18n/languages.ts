export const languageOptions = [
    { value: "en", label: "English", locale: "en-US" },
    { value: "de", label: "Deutsch", locale: "de-DE" },
    { value: "bg", label: "Български", locale: "bg-BG" },
    { value: "es", label: "Español", locale: "es-ES" },
    { value: "fr", label: "Français", locale: "fr-FR" },
    { value: "it", label: "Italiano", locale: "it-IT" },
    { value: "pt", label: "Português", locale: "pt-PT" },
    { value: "pl", label: "Polski", locale: "pl-PL" },
    { value: "nl", label: "Nederlands", locale: "nl-NL" },
    { value: "ro", label: "Română", locale: "ro-RO" },
    { value: "cs", label: "Čeština", locale: "cs-CZ" },
] as const;

export type Language = typeof languageOptions[number]["value"];

export const localeForLanguage = (language: Language) =>
    languageOptions.find(({ value }) => value === language)?.locale ?? "en-US";
