import { adminClient, corsHeaders } from "../_shared/billing.ts";
import {
    getRevenueCatDeletionQueueHealth,
    recordRevenueCatDeletionOutcome,
    revenueCatDeletionRetryWorkerStatus,
    type RevenueCatDeletionQueueRow,
} from "../_shared/revenuecat-deletion-queue.ts";
import { isAccountDeletionRetryAuthorized } from "../_shared/account-deletion-retry-auth.ts";

Deno.serve(async (request) => {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const schedulerSecret = Deno.env.get("ACCOUNT_DELETION_RETRY_SECRET");
    if (!isAccountDeletionRetryAuthorized(request.headers.get("x-cron-secret"), schedulerSecret)) {
        return json({ error: "Invalid scheduler credentials" }, 401);
    }

    const client = adminClient();
    const { data, error } = await client.rpc("claim_revenuecat_deletion_requests", { request_limit: 50 });
    if (error) return json({ error: "Could not claim RevenueCat deletion requests" }, 500);

    const results: { id: string; outcome: string }[] = [];
    let outcomePersistenceFailed = false;
    for (const queued of (data ?? []) as RevenueCatDeletionQueueRow[]) {
        try {
            const outcome = await recordRevenueCatDeletionOutcome(client, queued, Deno.env.get("REVENUECAT_SECRET_API_KEY"));
            results.push({ id: queued.id, outcome: outcome.kind });
        } catch (error) {
            outcomePersistenceFailed = true;
            console.error("RevenueCat deletion retry could not be recorded", { requestId: queued.id, error: error instanceof Error ? error.message : "Unknown error" });
            results.push({ id: queued.id, outcome: "recording_failed" });
        }
    }
    const health = await getRevenueCatDeletionQueueHealth(client);
    // A claimed request without a durable outcome must make the scheduler run
    // fail visibly. Its five-minute lease then permits the RPC to reclaim it.
    return json({ processed: results.length, results, health }, revenueCatDeletionRetryWorkerStatus(outcomePersistenceFailed, health));
});

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
