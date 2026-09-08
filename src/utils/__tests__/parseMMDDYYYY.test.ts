import { parseMMDDYYYY } from "../parseMMDDYYYY";

describe("parseMMDDYYYY", () => {
    test("parses an ISO calendar date in local time", () => {
        const parsed = parseMMDDYYYY("2026-09-04");
        expect(parsed.getFullYear()).toBe(2026);
        expect(parsed.getMonth()).toBe(8);
        expect(parsed.getDate()).toBe(4);
        expect(parsed.getHours()).toBe(0);
    });
});
