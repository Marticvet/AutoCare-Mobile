jest.mock("npm:@supabase/supabase-js@2", () => ({ createClient: jest.fn() }), { virtual: true });

import { readFileSync } from "fs";
import { join } from "path";
import { syncRevenueCatCustomer } from "../_shared/billing";
import { revenueCatDeletionQueueHealth } from "../_shared/revenuecat-deletion-monitoring";
import {
    recordRevenueCatDeletionOutcome,
    revenueCatDeletionRetryWorkerStatus,
} from "../_shared/revenuecat-deletion-queue";
import {
    isRevenueCatTestEvent,
    revenueCatEventUserIds,
} from "../_shared/revenuecat-webhook";
import {
    RevenueCatDeletionInProgressError,
    processRevenueCatWebhookUsers,
} from "../_shared/revenuecat-webhook-processing";
import { isAccountDeletionRetryAuthorized } from "../_shared/account-deletion-retry-auth";

const userId = "11111111-1111-4111-8111-111111111111";

function mockClient(tombstoneStates: (null | { auth_deleted_at: string | null })[]) {
    let tombstoneRead = 0;
    const billingUpsert = jest.fn();
    const client = {
        from: jest.fn((table: string) => {
            if (table === "revenuecat_deletion_tombstones") {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({ data: tombstoneStates[tombstoneRead++] ?? null, error: null }),
                        }),
                    }),
                };
            }
            if (table === "billing_customers") {
                return {
                    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
                    upsert: billingUpsert,
                };
            }
            throw new Error(`Unexpected table ${table}`);
        }),
    };
    return { client, billingUpsert };
}

describe("RevenueCat deletion guards", () => {
    beforeEach(() => {
        Object.assign(globalThis, { Deno: { env: { get: jest.fn(() => "sk_test") } } });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete (globalThis as { Deno?: unknown }).Deno;
    });

    it("does not look up or recreate billing for a completed deletion tombstone", async () => {
        const { client, billingUpsert } = mockClient([{ auth_deleted_at: "2026-11-05T10:00:00.000Z" }]);
        const fetcher = jest.spyOn(global, "fetch");
        await expect(syncRevenueCatCustomer(client as never, userId)).resolves.toEqual({ kind: "deleted" });
        expect(fetcher).not.toHaveBeenCalled();
        expect(billingUpsert).not.toHaveBeenCalled();
    });

    it("recognizes dashboard TEST events before they can enter customer processing", () => {
        // RevenueCat's dashboard test uses a UUID-shaped synthetic identity,
        // so UUID validation alone cannot distinguish it from a real customer.
        const dashboardTestId = "bab28d4e-4ce7-48f9-a4c4-b7657d41f88f";
        expect(isRevenueCatTestEvent({ type: "TEST", app_user_id: dashboardTestId })).toBe(true);
        expect(revenueCatEventUserIds({ type: "TEST", app_user_id: dashboardTestId })).toEqual([dashboardTestId]);
        expect(isRevenueCatTestEvent({ type: "RENEWAL", app_user_id: userId })).toBe(false);
    });

    it("defers a webhook while Auth deletion is pending and consumes only a completed deletion's late event", async () => {
        await expect(processRevenueCatWebhookUsers([userId], async () => ({ kind: "deletion_pending" })))
            .rejects.toBeInstanceOf(RevenueCatDeletionInProgressError);
        await expect(processRevenueCatWebhookUsers([userId], async () => ({ kind: "deleted" })))
            .resolves.toEqual({ ignoredDeletedAccount: true });
    });

    it("rechecks the tombstone after a RevenueCat lookup before attempting an upsert", async () => {
        const { client, billingUpsert } = mockClient([null, { auth_deleted_at: "2026-11-05T10:00:00.000Z" }]);
        jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ subscriber: {} }), { status: 200 }));
        await expect(syncRevenueCatCustomer(client as never, userId)).resolves.toEqual({ kind: "deleted" });
        expect(billingUpsert).not.toHaveBeenCalled();
    });

    it("reports failed and aging queue entries for the external scheduler", () => {
        const now = Date.parse("2026-11-06T12:00:00.000Z");
        expect(revenueCatDeletionQueueHealth([
            { status: "queued", created_at: "2026-11-05T11:59:59.000Z" },
        ], now)).toMatchObject({ pending: 1, failed: 0, needsAttention: true });
        expect(revenueCatDeletionQueueHealth([
            { status: "failed", created_at: "2026-11-06T11:00:00.000Z" },
        ], now)).toMatchObject({ pending: 0, failed: 1, needsAttention: true });
    });

    it("persists a 404 confirmation without setting the non-null queue timestamp to null", async () => {
        const update = jest.fn(() => ({
            eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                        select: jest.fn(() => ({ maybeSingle: async () => ({ data: { id: "request-id" }, error: null }) })),
                    })),
                })),
            })),
        }));
        const client = { from: jest.fn(() => ({ update })) };
        jest.spyOn(global, "fetch").mockResolvedValue(new Response("", { status: 404 }));

        await expect(recordRevenueCatDeletionOutcome(client as never, {
            id: "request-id",
            app_user_id: userId,
            status: "processing",
            attempt_count: 2,
        }, "sk_test")).resolves.toEqual({ kind: "confirmed", status: 404 });

        const patch = update.mock.calls[0][0];
        expect(patch).toMatchObject({ status: "confirmed" });
        expect(patch).not.toHaveProperty("next_attempt_at");
    });

    it("persists a terminal non-retryable failure without nulling the queue timestamp", async () => {
        const update = jest.fn(() => ({
            eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                        select: jest.fn(() => ({ maybeSingle: async () => ({ data: { id: "request-id" }, error: null }) })),
                    })),
                })),
            })),
        }));
        const client = { from: jest.fn(() => ({ update })) };
        jest.spyOn(global, "fetch").mockResolvedValue(new Response("", { status: 401 }));

        await expect(recordRevenueCatDeletionOutcome(client as never, {
            id: "request-id",
            app_user_id: userId,
            status: "processing",
            attempt_count: 2,
        }, "sk_test")).resolves.toMatchObject({ kind: "failed", errorCode: "unauthorized" });

        const patch = update.mock.calls[0][0];
        expect(patch).toMatchObject({ status: "failed", last_error_code: "unauthorized" });
        expect(patch).not.toHaveProperty("next_attempt_at");
    });

    it("returns 503 when outcome persistence fails, even before the stale lease ages into a queue-health alert", () => {
        const freshProcessingHealth = revenueCatDeletionQueueHealth([
            { status: "processing", created_at: "2026-11-06T11:59:59.000Z" },
        ], Date.parse("2026-11-06T12:00:00.000Z"));
        expect(freshProcessingHealth.needsAttention).toBe(false);
        expect(revenueCatDeletionRetryWorkerStatus(true, freshProcessingHealth)).toBe(503);
        expect(revenueCatDeletionRetryWorkerStatus(false, freshProcessingHealth)).toBe(200);
    });

    it("keeps expired processing leases reclaimable only after Auth deletion", () => {
        const migration = readFileSync(join(process.cwd(), "supabase/migrations/20261105010000_revenuecat_deletion_queue.sql"), "utf8");
        expect(migration).toContain("tombstone.auth_deleted_at is not null");
        expect(migration).toContain("(request.status = 'processing' and request.locked_until <= now())");
    });

    it("rejects unauthenticated retry-worker invocations", () => {
        expect(isAccountDeletionRetryAuthorized(null, "server-only-secret")).toBe(false);
        expect(isAccountDeletionRetryAuthorized("wrong", "server-only-secret")).toBe(false);
        expect(isAccountDeletionRetryAuthorized("server-only-secret", "server-only-secret")).toBe(true);
    });
});
