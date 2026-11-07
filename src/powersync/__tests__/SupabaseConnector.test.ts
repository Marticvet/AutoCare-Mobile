/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock("@powersync/react-native", () => ({
    UpdateType: { PUT: "PUT", PATCH: "PATCH", DELETE: "DELETE" },
}));
jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn(() => ({})) }));
jest.mock("@react-native-async-storage/async-storage", () => ({}));
jest.mock("react-native-url-polyfill/auto", () => ({}));

process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.invalid";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.EXPO_PUBLIC_POWERSYNC_URL = "https://powersync.example.invalid";

const { SupabaseConnector } = require("../SupabaseConnector") as typeof import("../SupabaseConnector");
const { UpdateType } = require("@powersync/react-native") as { UpdateType: Record<string, string> };
const { createClient } = require("@supabase/supabase-js") as { createClient: jest.Mock };

describe("PowerSync upload queue", () => {
    it("configures Supabase Auth to use PKCE for native OAuth callbacks", () => {
        new SupabaseConnector();

        expect(createClient).toHaveBeenCalledWith(
            "https://example.invalid",
            "test-anon-key",
            expect.objectContaining({
                auth: expect.objectContaining({
                    flowType: "pkce",
                    detectSessionInUrl: false,
                }),
            })
        );
    });

    it("leaves a failed upload uncompleted so the same transaction can retry", async () => {
        const uploadFailure = new Error("network request failed");
        const upsert = jest.fn()
            .mockResolvedValueOnce({ error: uploadFailure })
            .mockResolvedValueOnce({ error: null });
        const connector = Object.create(SupabaseConnector.prototype) as InstanceType<typeof SupabaseConnector>;
        connector.client = {
            from: jest.fn(() => ({ upsert })),
        } as any;
        const complete = jest.fn().mockResolvedValue(undefined);
        const transaction = {
            crud: [{
                table: "vehicles",
                op: UpdateType.PUT,
                id: "offline-vehicle",
                opData: { user_id: "owner-id", make: "Offline", model: "Acceptance" },
            }],
            complete,
        };
        const database = {
            getNextCrudTransaction: jest.fn().mockResolvedValue(transaction),
        };

        await expect(connector.uploadData(database as any)).rejects.toThrow("network request failed");
        expect(complete).not.toHaveBeenCalled();

        await connector.uploadData(database as any);
        expect(upsert).toHaveBeenCalledTimes(2);
        expect(complete).toHaveBeenCalledTimes(1);
    });
});
