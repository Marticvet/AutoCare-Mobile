module.exports = {
    root: true,
    extends: ["expo"],
    ignorePatterns: ["node_modules/", "android/", "ios/", "supabase/functions/"],
    rules: {
        "react-hooks/exhaustive-deps": "warn",
        "no-console": ["warn", { allow: ["warn", "error"] }],
    },
};
