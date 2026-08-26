module.exports = {
    root: true,
    extends: ["expo"],
    ignorePatterns: ["node_modules/", "android/", "ios/"],
    rules: {
        "react-hooks/exhaustive-deps": "warn",
        "no-console": ["warn", { allow: ["warn", "error"] }],
    },
};

