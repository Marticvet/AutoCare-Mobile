import { edgeFunctionErrorMessage } from "../edgeFunctionError";

const response = (status: number, payload?: unknown) => ({
    status,
    clone() { return this; },
    async json() {
        if (payload === undefined) throw new Error("No JSON body");
        return payload;
    },
    async text() { return ""; },
});

describe("edge function errors", () => {
    test("surfaces the JSON error returned by the function", async () => {
        const context = response(503, { error: "Receipt OCR is not configured yet." });
        await expect(edgeFunctionErrorMessage({ message: "Edge Function returned a non-2xx status code", context }))
            .resolves.toBe("Receipt OCR is not configured yet.");
    });

    test("explains a missing deployed function", async () => {
        await expect(edgeFunctionErrorMessage(
            { message: "Edge Function returned a non-2xx status code" },
            response(404)
        )).resolves.toBe("Receipt scanning is not available on the server yet.");
    });

    test("preserves useful network errors", async () => {
        await expect(edgeFunctionErrorMessage(new Error("Network request failed")))
            .resolves.toBe("Network request failed");
    });
});
