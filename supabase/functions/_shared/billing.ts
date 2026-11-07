import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
    mirrorRowFromSubscriber,
    type BillingMirrorRow,
    type RevenueCatSubscriberResponse,
} from "./revenuecat-mirror.ts";
import { deletionTombstoneState } from "./revenuecat-deletion-queue.ts";
import { revenueCatCustomerSyncDisposition } from "./revenuecat-customer-sync-guard.ts";

export { FAMILY_ENTITLEMENT, PLUS_ENTITLEMENT, mirrorRowFromSubscriber } from "./revenuecat-mirror.ts";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type { BillingMirrorRow } from "./revenuecat-mirror.ts";

export function isSupabaseUserId(value: unknown): value is string {
    return typeof value === "string" && UUID_PATTERN.test(value);
}

export function adminClient() {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceRole) throw new Error("Supabase service-role configuration is missing.");
    return createClient(url, serviceRole, { auth: { persistSession: false } });
}

export type RevenueCatCustomerSyncResult =
    | { kind: "synced"; billing: BillingMirrorRow }
    | { kind: "deletion_pending" | "deleted" };

async function fetchRevenueCatSubscriber(appUserId: string) {
    const secret = Deno.env.get("REVENUECAT_SECRET_API_KEY");
    if (!secret) throw new Error("REVENUECAT_SECRET_API_KEY is missing.");
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
        headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`RevenueCat customer lookup failed with ${response.status}.`);
    return await response.json() as RevenueCatSubscriberResponse;
}

export async function syncRevenueCatCustomer(
    client: SupabaseClient,
    userId: string,
    eventId: string | null = null,
    eventType?: string
): Promise<RevenueCatCustomerSyncResult> {
    if (!isSupabaseUserId(userId)) throw new Error("RevenueCat App User ID is not a Supabase UUID.");
    const beforeLookup = await deletionTombstoneState(client, userId);
    const lookupDisposition = revenueCatCustomerSyncDisposition(beforeLookup);
    if (lookupDisposition !== "sync") return { kind: lookupDisposition };
    const { data: existing, error: existingError } = await client
        .from("billing_customers")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.is_admin === true) return { kind: "synced", billing: existing as BillingMirrorRow };
    if (
        existing?.plan === "fleet"
        && ["active", "grace_period", "billing_issue", "cancelled"].includes(existing.status)
        && (!existing.expires_at || new Date(existing.expires_at).getTime() > Date.now())
    ) {
        return { kind: "synced", billing: existing as BillingMirrorRow };
    }
    const subscriber = await fetchRevenueCatSubscriber(userId);
    // The deletion flow writes its tombstone before deleting Auth. Recheck
    // after the RevenueCat GET so a concurrent deletion cannot recreate a
    // billing row after the customer request has begun.
    const beforeWrite = await deletionTombstoneState(client, userId);
    const writeDisposition = revenueCatCustomerSyncDisposition(beforeWrite);
    if (writeDisposition !== "sync") return { kind: writeDisposition };
    const row = mirrorRowFromSubscriber(userId, subscriber, eventId, eventType);
    const { data, error } = await client.from("billing_customers").upsert(row, { onConflict: "user_id" }).select().single();
    if (error) throw error;
    return { kind: "synced", billing: data as BillingMirrorRow };
}

export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
