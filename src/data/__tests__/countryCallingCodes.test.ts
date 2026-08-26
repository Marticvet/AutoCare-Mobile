import { splitStoredPhone } from "../countryCallingCodes";

describe("splitStoredPhone", () => {
    it("extracts the longest matching country calling code", () => {
        expect(splitStoredPhone("+359881234567")).toEqual({
            countryCode: "+359",
            nationalNumber: "881234567",
        });
    });

    it("keeps a separately stored country code and national number", () => {
        expect(splitStoredPhone("017656723368", "+49")).toEqual({
            countryCode: "+49",
            nationalNumber: "017656723368",
        });
    });

    it("migrates a legacy minus-prefixed international phone", () => {
        expect(splitStoredPhone("-17656723368")).toEqual({
            countryCode: "+1",
            nationalNumber: "7656723368",
        });
    });

    it("falls back to Germany for a national number without a code", () => {
        expect(splitStoredPhone("0176 567 23368")).toEqual({
            countryCode: "+49",
            nationalNumber: "017656723368",
        });
    });
});
