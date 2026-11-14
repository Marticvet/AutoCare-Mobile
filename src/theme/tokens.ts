import { DynamicColorIOS, Platform, PlatformColor } from "react-native";

const adaptive = (light: string, dark: string, androidSemantic?: string): string => {
    if (Platform.OS === "ios") return DynamicColorIOS({ light, dark }) as unknown as string;
    if (Platform.OS === "android" && androidSemantic) return PlatformColor(androidSemantic) as unknown as string;
    return light;
};

export const colors = {
    ink: adaptive("#17233F", "#F3F6FF", "?android:attr/textColorPrimary"),
    inkMuted: adaptive("#5F6B84", "#AEB8CE", "?android:attr/textColorSecondary"),
    primary: adaptive("#2F6BFF", "#78A2FF", "?android:attr/colorAccent"),
    primaryFill: "#2F6BFF",
    primaryDark: adaptive("#1E4FD1", "#9AB9FF", "?android:attr/colorAccent"),
    primarySoft: adaptive("#E9F0FF", "#1E315E", "?android:attr/colorControlHighlight"),
    accent: adaptive("#16A085", "#55D6B5"),
    accentSoft: adaptive("#DDF7F0", "#173D35"),
    warning: adaptive("#B86F00", "#FFBE4A"),
    warningSoft: adaptive("#FFF4D6", "#493713"),
    danger: adaptive("#C53643", "#FF7C87", "?android:attr/colorError"),
    dangerSoft: adaptive("#FDE9EB", "#4A2026"),
    success: adaptive("#0F7655", "#55D6A4"),
    successSoft: adaptive("#DFF5EC", "#173D31"),
    canvas: adaptive("#F4F6FA", "#0D1424", "?android:attr/colorBackground"),
    surface: adaptive("#FFFFFF", "#172033", "?android:attr/colorBackgroundFloating"),
    surfaceRaised: adaptive("#FFFFFF", "#202B40", "?android:attr/colorBackgroundFloating"),
    border: adaptive("#DFE4EE", "#344058", "?android:attr/listDivider"),
    borderStrong: adaptive("#C9D1E1", "#526078", "?android:attr/textColorSecondary"),
    brandNavy: "#17233F",
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

