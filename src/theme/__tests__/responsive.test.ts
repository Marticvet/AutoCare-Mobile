import { responsiveLayoutFor } from "../responsive";

describe("responsiveLayoutFor", () => {
    it("uses compact spacing on narrow phones", () => {
        const layout = responsiveLayoutFor(320, 568);
        expect(layout.isCompact).toBe(true);
        expect(layout.isLargeScreen).toBe(false);
        expect(layout.gutter).toBe(12);
    });

    it("recognizes tablets and landscape windows", () => {
        const layout = responsiveLayoutFor(1024, 768);
        expect(layout.isLargeScreen).toBe(true);
        expect(layout.isLandscape).toBe(true);
        expect(layout.gutter).toBe(24);
    });

    it("uses effective width when accessibility text is enlarged", () => {
        const layout = responsiveLayoutFor(768, 1024, 2);
        expect(layout.effectiveWidth).toBe(384);
        expect(layout.isCompact).toBe(true);
    });
});
