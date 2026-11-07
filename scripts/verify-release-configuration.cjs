const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const packageJson = readJson("package.json");
const app = readJson("app.json").expo;
const eas = readJson("eas.json");
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(packageJson.packageManager === "npm@10.9.2", "package.json must pin npm@10.9.2.");
expect(packageJson.engines?.node === ">=20.19 <23", "package.json must retain the supported Node range.");
expect(app.version === packageJson.version, "Expo and package versions must match.");
expect(Boolean(app.ios?.bundleIdentifier), "iOS bundle identifier is missing.");
expect(Boolean(app.android?.package), "Android package name is missing.");
expect(Number.isInteger(app.android?.versionCode) && app.android.versionCode > 0, "Android versionCode must be a positive integer.");
expect(/^\d+$/.test(String(app.ios?.buildNumber || "")), "iOS buildNumber must be numeric.");
expect(eas.build?.development?.developmentClient === true, "development must be an explicit development client profile.");
expect(eas.build?.testflight?.distribution === "store", "testflight must use App Store distribution.");
expect(eas.build?.testflight?.env?.EXPO_PUBLIC_APP_ENV === "testflight", "testflight must identify itself separately from preview and production.");
expect(eas.build?.testflight?.env?.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY === "", "testflight must clear the Test Store key.");
expect(eas.build?.testflight?.env?.EXPO_PUBLIC_ENABLE_SOCIAL_AUTH === "true", "testflight must explicitly enable verified social authentication.");
expect(eas.build?.preview?.env?.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY === "", "preview must clear the Test Store key.");
expect(eas.build?.production?.env?.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY === "", "production must clear the Test Store key.");
expect(eas.build?.preview?.env?.EXPO_PUBLIC_APP_ENV === "preview", "preview must identify itself as preview.");
expect(eas.build?.production?.env?.EXPO_PUBLIC_APP_ENV === "production", "production must identify itself as production.");

const source = ["src", "app.config.js", "app.json", "eas.json"]
    .flatMap((entry) => {
        const target = path.join(root, entry);
        if (fs.statSync(target).isFile()) return [target];
        const files = [];
        const visit = (directory) => fs.readdirSync(directory, { withFileTypes: true }).forEach((child) => {
            const full = path.join(directory, child.name);
            if (child.isDirectory()) visit(full);
            else if (/\.(?:ts|tsx|js|json)$/.test(child.name)) files.push(full);
        });
        visit(target);
        return files;
    })
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
expect(!/EXPO_PUBLIC_(?:SUPABASE_)?SERVICE_ROLE|EXPO_PUBLIC_REVENUECAT_SECRET|EXPO_PUBLIC_STRIPE_SECRET/i.test(source), "A server secret appears to be exposed as EXPO_PUBLIC_.");

if (failures.length) {
    console.error("Release configuration check failed:\n- " + failures.join("\n- "));
    process.exit(1);
}
console.log("Release configuration check passed.");
