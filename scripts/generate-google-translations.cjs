/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "src/i18n/generatedTranslations.ts");
const cacheDirectory = path.join(projectRoot, ".translation-cache-v2");
const targets = {
    it: { name: "Italian", googleLocale: "it" },
    pt: { name: "Portuguese", googleLocale: "pt-PT" },
    pl: { name: "Polish", googleLocale: "pl" },
    nl: { name: "Dutch", googleLocale: "nl" },
    ro: { name: "Romanian", googleLocale: "ro" },
    cs: { name: "Czech", googleLocale: "cs" },
};
const protectedTerms = [
    "AutoCare Fleet",
    "AutoCare Plus",
    "AutoCare Hub",
    "Google Places",
    "Google Maps",
    "PowerSync",
    "Supabase",
    "RevenueCat",
    "Fuelio",
    "Drivvo",
];

function readObject(name, filename, valueForProperty) {
    const source = ts.createSourceFile(
        filename,
        fs.readFileSync(filename, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
    );
    let result;
    source.forEachChild((node) => {
        if (!ts.isVariableStatement(node)) return;
        for (const declaration of node.declarationList.declarations) {
            let initializer = declaration.initializer;
            while (
                initializer
                && (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer) || ts.isParenthesizedExpression(initializer))
            ) initializer = initializer.expression;
            if (
                declaration.name.getText(source) !== name
                || !initializer
                || !ts.isObjectLiteralExpression(initializer)
            ) continue;
            result = {};
            for (const property of initializer.properties) {
                if (!ts.isPropertyAssignment(property)) continue;
                const key = property.name.getText(source).replace(/^['"]|['"]$/g, "");
                result[key] = valueForProperty(property.initializer, source);
            }
        }
    });
    if (!result) throw new Error("Could not find " + name + " in " + filename);
    return result;
}

function literalText(node, source) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    throw new Error("Expected a string literal, received " + node.getText(source));
}

const core = readObject(
    "en",
    path.join(projectRoot, "src/i18n/translations.ts"),
    literalText
);
const features = readObject(
    "entries",
    path.join(projectRoot, "src/i18n/featureTranslations.ts"),
    (node, source) => {
        if (!ts.isArrayLiteralExpression(node) || !node.elements.length) {
            throw new Error("Expected a non-empty translation array, received " + node.getText(source));
        }
        return literalText(node.elements[0], source);
    }
);
const catalog = { ...core, ...features };
const catalogEntries = Object.entries(catalog);

function decodeHtml(value) {
    return value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/&#(x?[0-9a-f]+);/gi, (_, encoded) => String.fromCodePoint(
            encoded[0].toLowerCase() === "x"
                ? Number.parseInt(encoded.slice(1), 16)
                : Number.parseInt(encoded, 10)
        ))
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}

function placeholders(value) {
    return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)]
        .map((match) => match[1])
        .sort();
}

function protect(value) {
    const names = placeholders(value);
    const terms = protectedTerms.filter((term) => value.includes(term));
    const withProtectedPlaceholders = names.reduce(
        (current, name, index) => current.replaceAll("{" + name + "}", "ZXQPH" + index + "QXZ"),
        value
    );
    return {
        text: terms.reduce(
            (current, term, index) => current.replaceAll(term, "ZXQTERM" + index + "QXZ"),
            withProtectedPlaceholders
        ),
        names,
        terms,
    };
}

function restore(value, names, terms) {
    const withPlaceholders = names.reduce(
        (current, name, index) => current.replace(
            new RegExp("ZXQPH\\s*" + index + "\\s*QXZ", "gi"),
            "{" + name + "}"
        ),
        value
    );
    return terms.reduce(
        (current, term, index) => current.replace(
            new RegExp("ZXQTERM\\s*" + index + "\\s*QXZ", "gi"),
            term
        ),
        withPlaceholders
    );
}

function makeBatches(entries, limit = 1800) {
    const result = [];
    let batch = [];
    let length = 0;
    for (const entry of entries) {
        const nextLength = entry.payload.length + 16;
        if (batch.length && length + nextLength > limit) {
            result.push(batch);
            batch = [];
            length = 0;
        }
        batch.push(entry);
        length += nextLength;
    }
    if (batch.length) result.push(batch);
    return result;
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function translateBatch(locale, googleLocale, batch, attempt = 1) {
    const query = batch.map((entry) => entry.marker + " " + entry.payload).join("\n");
    const url = new URL("https://translate.google.com/m");
    url.searchParams.set("sl", "en");
    url.searchParams.set("tl", googleLocale);
    url.searchParams.set("q", query);
    const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 AutoCare-Localization/1.0" },
    });

    if (!response.ok) {
        if (attempt < 5 && (response.status === 429 || response.status >= 500)) {
            await pause(attempt * 2_000);
            return translateBatch(locale, googleLocale, batch, attempt + 1);
        }
        throw new Error("Google Translate returned HTTP " + response.status);
    }

    const html = await response.text();
    const resultMatch = html.match(/<div class="result-container">([\s\S]*?)<\/div>/);
    if (!resultMatch) throw new Error("Google Translate did not return a translation result");
    const translated = decodeHtml(resultMatch[1]);
    if (batch.length === 1) {
        const entry = batch[0];
        const value = restore(
            translated.replaceAll(entry.marker, "").trim(),
            entry.placeholderNames,
            entry.protectedTerms
        );
        const expected = placeholders(catalog[entry.key]).join("|");
        const actual = placeholders(value).join("|");
        if (!value || actual !== expected) {
            throw new Error(
                "Invalid translation for " + locale + "." + entry.key
                + " (expected placeholders " + expected + ", received " + actual + "): " + value
            );
        }
        return [[entry.key, value]];
    }
    const positions = batch.map((entry) => ({
        entry,
        index: translated.indexOf(entry.marker),
    }));

    const markersMissing = positions.some(({ index }) => index < 0);
    const markersReordered = positions.some(({ index }, positionIndex) =>
        positionIndex > 0 && index <= positions[positionIndex - 1].index
    );
    if (markersMissing || markersReordered) {
        if (batch.length > 1) {
            const midpoint = Math.ceil(batch.length / 2);
            return [
                ...await translateBatch(locale, googleLocale, batch.slice(0, midpoint)),
                ...await translateBatch(locale, googleLocale, batch.slice(midpoint)),
            ];
        }
        throw new Error("Translation marker was not preserved for " + batch[0].key);
    }

    return positions.map(({ entry, index }, positionIndex) => {
        const start = index + entry.marker.length;
        const end = positions[positionIndex + 1]?.index ?? translated.length;
        const value = restore(translated.slice(start, end).trim(), entry.placeholderNames, entry.protectedTerms);
        const expected = placeholders(catalog[entry.key]).join("|");
        const actual = placeholders(value).join("|");
        if (!value || actual !== expected) {
            if (batch.length > 1) return null;
            throw new Error(
                "Invalid translation for " + locale + "." + entry.key
                + " (expected placeholders " + expected + ", received " + actual + "): " + value
            );
        }
        return [entry.key, value];
    });
}

async function translateLocale(locale, languageName, googleLocale) {
    fs.mkdirSync(cacheDirectory, { recursive: true });
    const cachePath = path.join(cacheDirectory, locale + ".json");
    const translated = fs.existsSync(cachePath)
        ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
        : {};
    const missing = catalogEntries
        .filter(([key]) => !translated[key])
        .map(([key, value], index) => {
            const protectedValue = protect(value);
            return {
                key,
                marker: String(index).padStart(4, "0") + "::",
                payload: protectedValue.text,
                placeholderNames: protectedValue.names,
                protectedTerms: protectedValue.terms,
            };
        });
    const batches = makeBatches(missing);

    console.log(languageName + ": " + Object.keys(translated).length + " cached, " + missing.length + " remaining");
    for (let index = 0; index < batches.length; index += 1) {
        let entries = await translateBatch(locale, googleLocale, batches[index]);
        if (entries.some((entry) => entry === null)) {
            entries = [];
            for (const item of batches[index]) {
                entries.push(...await translateBatch(locale, googleLocale, [item]));
            }
        }
        for (const [key, value] of entries) translated[key] = value;
        fs.writeFileSync(cachePath, JSON.stringify(translated, null, 2) + "\n");
        console.log(languageName + ": batch " + (index + 1) + "/" + batches.length);
        await pause(250);
    }

    for (const [key] of catalogEntries) {
        if (!translated[key]) throw new Error("Missing " + locale + "." + key);
    }
    return Object.fromEntries(catalogEntries.map(([key]) => [key, translated[key]]));
}

function serialize(value) {
    return JSON.stringify(value, null, 4)
        .replace(/"([^"]+)":/g, (_, key) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key + ":" : '"' + key + '":');
}

async function main() {
    const translated = {};
    const locales = Object.entries(targets);
    for (let start = 0; start < locales.length; start += 2) {
        const pair = locales.slice(start, start + 2);
        const results = await Promise.all(pair.map(([locale, config]) =>
            translateLocale(locale, config.name, config.googleLocale)
        ));
        pair.forEach(([locale], index) => {
            translated[locale] = results[index];
        });
    }
    const output = [
        "// Generated from the English catalog by scripts/generate-google-translations.cjs.",
        "// Machine translations require native-speaker review before store release.",
        "export const generatedTranslations = " + serialize(translated) + " as const;",
        "",
    ].join("\n");
    fs.writeFileSync(outputPath, output);
    console.log("Wrote " + outputPath + " with " + catalogEntries.length + " keys per language");
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = { catalog, placeholders };
