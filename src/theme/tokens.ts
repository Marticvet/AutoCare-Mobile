import { Platform } from "react-native";

export const colors = {
    ink: "#17233F",
    inkMuted: "#5F6B84",
    primary: "#2F6BFF",
    primaryDark: "#1E4FD1",
    primarySoft: "#E9F0FF",
    accent: "#16A085",
    accentSoft: "#DDF7F0",
    warning: "#F3A712",
    warningSoft: "#FFF4D6",
    danger: "#D64550",
    dangerSoft: "#FDE9EB",
    success: "#138A63",
    successSoft: "#DFF5EC",
    canvas: "#F4F6FA",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    border: "#DFE4EE",
    borderStrong: "#C9D1E1",
    white: "#FFFFFF",
    black: "#0A1020",
    overlay: "rgba(13, 24, 48, 0.55)",
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
} as const;

export const radius = {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    pill: 999,
} as const;

export const typography = {
    hero: { fontSize: 32, lineHeight: 38, fontWeight: "800" as const },
    title: { fontSize: 24, lineHeight: 30, fontWeight: "800" as const },
    heading: { fontSize: 19, lineHeight: 25, fontWeight: "700" as const },
    body: { fontSize: 16, lineHeight: 23, fontWeight: "400" as const },
    bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: "700" as const },
    label: { fontSize: 13, lineHeight: 18, fontWeight: "700" as const },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
} as const;

export const shadow = Platform.select({
    ios: {
        shadowColor: colors.ink,
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 3 },
    default: {},
});

