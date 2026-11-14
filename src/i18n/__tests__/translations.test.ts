import { languageOptions, type Language } from "../languages";
import { translations } from "../translations";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

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

    it("does not introduce raw user-facing JSX copy in release screens", () => {
        const roots = ["src/Screens/v2", "src/components"];
        const files = roots.flatMap(collectTsxFiles).concat([
            "src/Screens/LoginScreen.tsx",
            "src/Screens/RegisterScreen.tsx",
            "src/Screens/ForgotPasswordScreen.tsx",
            "src/Screens/ResetPasswordScreen.tsx",
            "src/Screens/OnboardingScreen.tsx",
        ]);
        const violations: string[] = [];

        files.forEach((file) => {
            const source = ts.createSourceFile(
                file,
                fs.readFileSync(file, "utf8"),
                ts.ScriptTarget.Latest,
                true,
                ts.ScriptKind.TSX
            );
            const visit = (node: ts.Node) => {
                if (ts.isJsxText(node)) {
                    const text = node.getText(source).trim();
                    if (/[A-Za-zÀ-žА-Яа-я]{2}/.test(text) && text !== "kg CO₂") {
                        violations.push(`${file}:${lineOf(source, node)}:${text}`);
                    }
                }
                if (
                    ts.isJsxAttribute(node)
                    && ["accessibilityLabel", "placeholder", "label", "title"].includes(node.name.getText(source))
                    && node.initializer
                    && ts.isStringLiteral(node.initializer)
                    && /[A-Za-zÀ-žА-Яа-я]{2}/.test(node.initializer.text)
                    && !/^AutoCare (Plus|Family)$/.test(node.initializer.text)
                ) {
                    violations.push(`${file}:${lineOf(source, node)}:${node.initializer.text}`);
                }
                ts.forEachChild(node, visit);
            };
            visit(source);
        });

        expect(violations).toEqual([]);
    });
});

function collectTsxFiles(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) return collectTsxFiles(target);
        return entry.isFile() && entry.name.endsWith(".tsx") ? [target] : [];
    });
}

function lineOf(source: ts.SourceFile, node: ts.Node) {
    return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}
