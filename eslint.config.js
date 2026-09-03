const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
    globalIgnores([
        "node_modules/**",
        "android/**",
        "ios/**",
        "supabase/functions/**",
    ]),
    expoConfig,
    {
        rules: {
            "react-hooks/exhaustive-deps": "warn",
            "no-console": ["warn", { allow: ["warn", "error"] }],
        },
    },
]);
