import { languageOptions, type Language } from "../languages";
import { translations } from "../translations";

const languages: Language[] = languageOptions.map(({ value }) => value);

function placeholders(value: string) {
    return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)]
        .map((match) => match[1])
        .sort();
}

describe("translations", () => {
    it("provides every key in every supported language", () => {
        const englishKeys = Object.keys(translations.en).sort();

        languages.forEach((language) => {
            expect(Object.keys(translations[language]).sort()).toEqual(englishKeys);
            englishKeys.forEach((key) => {
                expect(translations[language][key as keyof typeof translations.en].trim()).not.toBe("");
            });
        });
    });

    it("keeps interpolation placeholders consistent across languages", () => {
        const englishEntries = Object.entries(translations.en);

        languages.forEach((language) => {
            englishEntries.forEach(([key, englishValue]) => {
                expect(placeholders(translations[language][key as keyof typeof translations.en]))
                    .toEqual(placeholders(englishValue));
            });
        });
    });
});
