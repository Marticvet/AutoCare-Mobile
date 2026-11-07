import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
    REVENUECAT_DELETION_CONFIRMATION_DELAY_MS,
    requestRevenueCatCustomerDeletion,
    type RevenueCatDeletionResult,
} from "./revenuecat-deletion.ts";
import { revenueCatDeletionQueueHealth } from "./revenuecat-deletion-monitoring.ts";

export type RevenueCatDeletionQueueRow = {
    id: string;
    app_user_id: string;
    status: "awaiting_auth_deletion" | "queued" | "processing" | "requested" | "confirmed" | "failed";
    attempt_count: number;
};

export type RevenueCatDeletionTombstoneState = "none" | "pending_auth_deletion" | "auth_deleted";

export async function deletionTombstoneState(client: SupabaseClient, appUserId: string): Promise<RevenueCatDeletionTombstoneState> {
    const { data, error } = await client
        .from("revenuecat_deletion_tombstones")
        .select("auth_deleted_at")
        .eq("app_user_id", appUserId)
        .maybeSingle();
    if (error) throw error;
    if (!data) return "none";
    return data.auth_deleted_at ? "auth_deleted" : "pending_auth_deletion";
}

export async function createRevenueCatDeletionTombstone(client: SupabaseClient, appUserId: string) {
    const { error } = await client
        .from("revenuecat_deletion_tombstones")
        .insert({ app_user_id: appUserId });
    if (error && error.code !== "23505") throw error;
    const state = await deletionTombstoneState(client, appUserId);
    if (state === "none") throw new Error("RevenueCat deletion tombstone could not be persisted.");
    return state;
}

export async function confirmRevenueCatDeletionAuthDeleted(client: SupabaseClient, appUserId: string) {
    const { data, error } = await client
        .from("revenuecat_deletion_tombstones")
        .update({ auth_deleted_at: new Date().toISOString() })
        .eq("app_user_id", appUserId)
        .is("auth_deleted_at", null)
        .select("app_user_id")
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("RevenueCat deletion tombstone is missing after Auth deletion.");
}

export async function removePendingRevenueCatDeletion(client: SupabaseClient, appUserId: string) {
    const { error: queueError } = await client
        .from("revenuecat_deletion_requests")
        .delete()
        .eq("app_user_id", appUserId)
        .eq("status", "awaiting_auth_deletion");
    if (queueError) throw queueError;
    const { error } = await client
        .from("revenuecat_deletion_tombstones")
        .delete()
        .eq("app_user_id", appUserId)
        .is("auth_deleted_at", null);
    if (error) throw error;
}

export async function enqueueRevenueCatDeletion(client: SupabaseClient, appUserId: string) {
    const { data: existing, error: existingError } = await client
        .from("revenuecat_deletion_requests")
        .select("id, app_user_id, status, attempt_count")
        .eq("app_user_id", appUserId)
        .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return existing as RevenueCatDeletionQueueRow;

    const { data, error } = await client
        .from("revenuecat_deletion_requests")
        .insert({ app_user_id: appUserId, status: "awaiting_auth_deletion", next_attempt_at: new Date().toISOString() })
        .select("id, app_user_id, status, attempt_count")
        .single();
    if (error?.code === "23505") {
        const { data: concurrent, error: concurrentError } = await client
            .from("revenuecat_deletion_requests")
            .select("id, app_user_id, status, attempt_count")
            .eq("app_user_id", appUserId)
            .single();
        if (concurrentError) throw concurrentError;
        return concurrent as RevenueCatDeletionQueueRow;
    }
    if (error) throw error;
    return data as RevenueCatDeletionQueueRow;
}

export async function makeRevenueCatDeletionEligible(client: SupabaseClient, requestId: string) {
    const { data, error } = await client
        .from("revenuecat_deletion_requests")
        .update({ status: "queued", next_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", requestId)
        .eq("status", "awaiting_auth_deletion")
        .select("id, app_user_id, status, attempt_count")
        .single();
    if (error) throw error;
    return data as RevenueCatDeletionQueueRow;
}

export async function claimRevenueCatDeletion(client: SupabaseClient, requestId: string) {
    const now = new Date();
    const { data, error } = await client
        .from("revenuecat_deletion_requests")
        .update({
            status: "processing",
            attempt_count: 1,
            last_attempt_at: now.toISOString(),
            locked_until: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        })
        .eq("id", requestId)
        .eq("status", "queued")
        .select("id, app_user_id, status, attempt_count")
        .maybeSingle();
    if (error) throw error;
    return data as RevenueCatDeletionQueueRow | null;
}

export async function recordRevenueCatDeletionOutcome(
    client: SupabaseClient,
    request: RevenueCatDeletionQueueRow,
    secretApiKey: string | undefined
): Promise<RevenueCatDeletionResult> {
    const outcome = await requestRevenueCatCustomerDeletion({
        appUserId: request.app_user_id,
        secretApiKey,
        attempt: request.attempt_count,
    });
    const now = new Date();
    const base = {
        locked_until: null,
        last_error_code: outcome.kind === "requested" || outcome.kind === "confirmed" ? null : outcome.errorCode,
        updated_at: now.toISOString(),
    };
    let patch: Record<string, unknown>;
    if (outcome.kind === "requested") {
        patch = {
            ...base,
            status: "requested",
            revenuecat_requested_at: now.toISOString(),
            next_attempt_at: new Date(now.getTime() + REVENUECAT_DELETION_CONFIRMATION_DELAY_MS).toISOString(),
        };
    } else if (outcome.kind === "confirmed") {
        // `next_attempt_at` is intentionally retained for terminal rows. The
        // deployed queue schema makes it NOT NULL, and confirmed rows are
        // excluded from the due-work index/claim query by status.
        patch = { ...base, status: "confirmed", confirmed_at: now.toISOString() };
    } else if (outcome.kind === "retry") {
        patch = {
            ...base,
            status: "queued",
            next_attempt_at: new Date(now.getTime() + outcome.retryAfterMs).toISOString(),
        };
    } else {
        patch = { ...base, status: "failed" };
    }
    const { data, error } = await client
        .from("revenuecat_deletion_requests")
        .update(patch)
        .eq("id", request.id)
        .eq("status", "processing")
        .eq("attempt_count", request.attempt_count)
        .select("id")
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("RevenueCat deletion queue lock was lost before the outcome could be recorded.");
    return outcome;
}

export async function getRevenueCatDeletionQueueHealth(client: SupabaseClient) {
    const { data, error } = await client
        .from("revenuecat_deletion_requests")
        .select("status, created_at")
        .in("status", ["queued", "processing", "requested", "failed"]);
    if (error) throw error;
    return revenueCatDeletionQueueHealth((data ?? []) as Parameters<typeof revenueCatDeletionQueueHealth>[0]);
}

export function revenueCatDeletionRetryWorkerStatus(outcomePersistenceFailed: boolean, health: { needsAttention: boolean }) {
    return outcomePersistenceFailed || health.needsAttention ? 503 : 200;
}
