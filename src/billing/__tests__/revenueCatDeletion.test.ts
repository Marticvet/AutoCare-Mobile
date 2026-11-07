import {
    requestRevenueCatCustomerDeletion,
    retryDelayMs,
    revenueCatAppUserIdForAuthenticatedUser,
} from "../../../supabase/functions/_shared/revenuecat-deletion";

const userId = "11111111-1111-4111-8111-111111111111";

describe("RevenueCat customer deletion", () => {
    it("uses only the authenticated Supabase UUID and the v1 DELETE endpoint", async () => {
        const fetcher = jest.fn().mockResolvedValue(new Response("", { status: 200 }));
        await expect(requestRevenueCatCustomerDeletion({ appUserId: userId, secretApiKey: "sk_test", attempt: 1, fetcher })).resolves.toEqual({ kind: "requested", status: 200 });
        expect(fetcher).toHaveBeenCalledWith(
            `https://api.revenuecat.com/v1/subscribers/${userId}`,
            expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer sk_test", Accept: "application/json" } })
        );
        expect(() => revenueCatAppUserIdForAuthenticatedUser("$RCAnonymousID:other-customer")).toThrow("invalid RevenueCat identity");
    });

    it("treats a later 404 as confirmation without recreating the customer", async () => {
        const fetcher = jest.fn().mockResolvedValue(new Response("", { status: 404 }));
        await expect(requestRevenueCatCustomerDeletion({ appUserId: userId, secretApiKey: "sk_test", attempt: 2, fetcher })).resolves.toEqual({ kind: "confirmed", status: 404 });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("retries the same customer deletion idempotently until confirmation", async () => {
        const fetcher = jest.fn()
            .mockResolvedValueOnce(new Response("", { status: 200 }))
            .mockResolvedValueOnce(new Response("", { status: 404 }));
        await expect(requestRevenueCatCustomerDeletion({ appUserId: userId, secretApiKey: "sk_test", attempt: 1, fetcher }))
            .resolves.toMatchObject({ kind: "requested" });
        await expect(requestRevenueCatCustomerDeletion({ appUserId: userId, secretApiKey: "sk_test", attempt: 2, fetcher }))
            .resolves.toMatchObject({ kind: "confirmed" });
        expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
            `https://api.revenuecat.com/v1/subscribers/${userId}`,
            `https://api.revenuecat.com/v1/subscribers/${userId}`,
        ]);
    });

    it("queues retryable API and network failures with bounded backoff", async () => {
        const rateLimited = jest.fn().mockResolvedValue(new Response("", { status: 429, headers: { "Retry-After": "300" } }));
        await expect(requestRevenueCatCustomerDeletion({ appUserId: userId, secretApiKey: "sk_test", attempt: 3, fetcher: rateLimited })).resolves.toMatchObject({ kind: "retry", status: 429, retryAfterMs: 300_000 });
        const offline = jest.fn().mockRejectedValue(new Error("offline"));
        await expect(requestRevenueCatCustomerDeletion({ appUserId: userId, secretApiKey: "sk_test", attempt: 1, fetcher: offline })).resolves.toMatchObject({ kind: "retry", retryAfterMs: 60_000 });
        expect(retryDelayMs(99)).toBe(24 * 60 * 60 * 1000);
    });

    it("records non-retryable configuration and authorization failures for follow-up", async () => {
        const unauthorized = jest.fn().mockResolvedValue(new Response("", { status: 401 }));
        await expect(requestRevenueCatCustomerDeletion({ appUserId: userId, secretApiKey: "sk_test", attempt: 1, fetcher: unauthorized })).resolves.toEqual({ kind: "failed", status: 401, errorCode: "unauthorized" });
        await expect(requestRevenueCatCustomerDeletion({ appUserId: userId, secretApiKey: undefined, attempt: 1, fetcher: unauthorized })).resolves.toEqual({ kind: "failed", errorCode: "not_configured" });
    });
});
