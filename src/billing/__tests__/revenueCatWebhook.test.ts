import {
    RevenueCatWebhookAuthenticationError,
    RevenueCatWebhookConfigurationError,
    revenueCatEventUserIds,
    verifyRevenueCatWebhook,
} from "../../../supabase/functions/_shared/revenuecat-webhook";

const firstUser = "11111111-1111-4111-8111-111111111111";
const secondUser = "22222222-2222-4222-8222-222222222222";

describe("RevenueCat webhook security", () => {
    it("uses only Supabase UUID identities and handles transfer participants", () => {
        expect(revenueCatEventUserIds({
            type: "RENEWAL",
            app_user_id: firstUser,
            original_app_user_id: firstUser,
            aliases: ["$RCAnonymousID:ignored", secondUser],
        })).toEqual([firstUser, secondUser]);

        expect(revenueCatEventUserIds({
            type: "TRANSFER",
            app_user_id: firstUser,
            aliases: [firstUser],
            transferred_from: [firstUser, "not-a-user"],
            transferred_to: [secondUser, firstUser],
        })).toEqual([firstUser, secondUser]);
    });

    it("accepts a matching RevenueCat Authorization header without optional HMAC", async () => {
        const hmacSha256 = jest.fn();
        await expect(verifyRevenueCatWebhook({
            authorization: "Bearer configured-value",
            expectedAuthorization: "Bearer configured-value",
            signatureHeader: "",
            rawBody: '{"event":{"id":"evt_1"}}',
            hmacSha256,
        })).resolves.toBeUndefined();
        expect(hmacSha256).not.toHaveBeenCalled();
    });

    it("verifies a current HMAC delivery when signing is explicitly configured", async () => {
        const hmacSha256 = jest.fn().mockResolvedValue("computed-signature");
        await expect(verifyRevenueCatWebhook({
            authorization: "Bearer configured-value",
            expectedAuthorization: "Bearer configured-value",
            signatureHeader: "t=1000,v1=computed-signature",
            signingSecret: "server-only-secret",
            rawBody: '{"event":{"id":"evt_1"}}',
            nowSeconds: 1000,
            hmacSha256,
        })).resolves.toBeUndefined();
        expect(hmacSha256).toHaveBeenCalledWith("1000.{\"event\":{\"id\":\"evt_1\"}}", "server-only-secret");
    });

    it("rejects missing authorization configuration, invalid authorization, stale deliveries, and invalid configured signatures", async () => {
        const input = {
            authorization: "Bearer configured-value",
            expectedAuthorization: "Bearer configured-value",
            signatureHeader: "t=1000,v1=computed-signature",
            signingSecret: "server-only-secret",
            rawBody: "{}",
            nowSeconds: 1000,
            hmacSha256: async () => "computed-signature",
        };
        await expect(verifyRevenueCatWebhook({ ...input, expectedAuthorization: "" }))
            .rejects.toBeInstanceOf(RevenueCatWebhookConfigurationError);
        await expect(verifyRevenueCatWebhook({ ...input, authorization: "" }))
            .rejects.toBeInstanceOf(RevenueCatWebhookAuthenticationError);
        await expect(verifyRevenueCatWebhook({ ...input, authorization: "Bearer wrong" }))
            .rejects.toBeInstanceOf(RevenueCatWebhookAuthenticationError);
        await expect(verifyRevenueCatWebhook({ ...input, nowSeconds: 1301 }))
            .rejects.toBeInstanceOf(RevenueCatWebhookAuthenticationError);
        await expect(verifyRevenueCatWebhook({ ...input, hmacSha256: async () => "different" }))
            .rejects.toBeInstanceOf(RevenueCatWebhookAuthenticationError);
    });
});
