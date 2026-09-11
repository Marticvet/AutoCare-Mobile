export const APP_CONTENT_MAX_WIDTH = 900;
export const SHEET_CONTENT_MAX_WIDTH = 620;

export type ResponsiveLayout = {
    width: number;
    height: number;
    fontScale: number;
    effectiveWidth: number;
    gutter: number;
    isCompact: boolean;
    isLargeScreen: boolean;
    isLandscape: boolean;
};

/**
 * Treat increased system text size as reduced horizontal space. This keeps
 * translated labels and accessibility-sized text from being forced into
 * layouts that only fit at the default font scale.
 */
export function responsiveLayoutFor(width: number, height: number, fontScale = 1): ResponsiveLayout {
    const safeFontScale = Number.isFinite(fontScale) ? Math.max(fontScale, 1) : 1;
    const effectiveWidth = width / safeFontScale;

    return {
        width,
        height,
        fontScale: safeFontScale,
        effectiveWidth,
        gutter: width < 360 || effectiveWidth < 360 ? 12 : width >= 700 ? 24 : 16,
        isCompact: effectiveWidth < 440,
        isLargeScreen: width >= 700,
        isLandscape: width > height,
    };
}
