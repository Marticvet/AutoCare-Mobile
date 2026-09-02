import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const PLUS_ENTITLEMENT = "plus_features";
export const FAMILY_ENTITLEMENT = "shared_garage";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RevenueCatEntitlement = {
    expires_date?: string | null;
    product_identifier?: string | null;
};

type RevenueCatSubscription = {
    expires_date?: string | null;
    store?: string | null;
    is_sandbox?: boolean;
    unsubscribe_detected_at?: string | null;
    billing_issues_detected_at?: string | null;
    grace_period_expires_date?: string | null;
};

type RevenueCatSubscriberResponse = {
    subscriber?: {
        entitlements?: Record<string, RevenueCatEntitlement>;
        subscriptions?: Record<string, RevenueCatSubscription>;
    };
};

export type BillingMirrorRow = {
    user_id: string;
    is_admin?: boolean;
    app_user_id: string;
    entitlement_id: string | null;
    entitlement_ids: string[];
    plan: "free" | "plus_monthly" | "plus_yearly" | "family_monthly" | "family_yearly" | "fleet";
    product_id: string | null;
    status: "active" | "grace_period" | "billing_issue" | "cancelled" | "expired" | "refunded" | "unknown";
    expires_at: string | null;
    will_renew: boolean;
    store: string | null;
    environment: string | null;
    last_event_id: string | null;
    updated_at: string;
};

export function isSupabaseUserId(value: unknown): value is string {
    return typeof value === "string" && UUID_PATTERN.test(value);
}

export function adminClient() {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceRole) throw new Error("Supabase service-role configuration is missing.");
    return createClient(url, serviceRole, { auth: { persistSession: false } });
}

async function fetchRevenueCatSubscriber(appUserId: string) {
    const secret = Deno.env.get("REVENUECAT_SECRET_API_KEY");
    if (!secret) throw new Error("REVENUECAT_SECRET_API_KEY is missing.");
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
        headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`RevenueCat customer lookup failed with ${response.status}.`);
    return await response.json() as RevenueCatSubscriberResponse;
}

function planForProduct(productId: string | null): BillingMirrorRow["plan"] {
    if (!productId) return "free";
    const yearly = /annual|year/i.test(productId);
    if (/family/i.test(productId)) return yearly ? "family_yearly" : "family_monthly";
    return yearly ? "plus_yearly" : "plus_monthly";
}

export function mirrorRowFromSubscriber(
    userId: string,
    response: RevenueCatSubscriberResponse,
    eventId: string | null = null,
    eventType?: string
): BillingMirrorRow {
    const entitlements = response.subscriber?.entitlements ?? {};
    const activeEntitlementIds = [PLUS_ENTITLEMENT, FAMILY_ENTITLEMENT].filter((id) => {
        const candidate = entitlements[id];
        if (!candidate) return false;
        return !candidate.expires_date || new Date(candidate.expires_date).getTime() > Date.now();
    });
    const entitlement = activeEntitlementIds.includes(FAMILY_ENTITLEMENT)
        ? entitlements[FAMILY_ENTITLEMENT]
        : activeEntitlementIds.includes(PLUS_ENTITLEMENT)
            ? entitlements[PLUS_ENTITLEMENT]
            : entitlements[FAMILY_ENTITLEMENT] ?? entitlements[PLUS_ENTITLEMENT];
    const productId = entitlement?.product_identifier ?? null;
    const subscription = productId ? response.subscriber?.subscriptions?.[productId] : undefined;
    const expiresAt = entitlement?.expires_date ?? subscription?.expires_date ?? null;
    const active = activeEntitlementIds.length > 0;
    let status: BillingMirrorRow["status"] = active ? "active" : entitlement ? "expired" : "unknown";
    // The freshly fetched subscriber is authoritative. A refund/expiration
    // event for one product must not disable another currently active product.
    if (active && subscription?.grace_period_expires_date) status = "grace_period";
    else if (active && subscription?.billing_issues_detected_at) status = "billing_issue";
    else if (active && subscription?.unsubscribe_detected_at) status = "cancelled";
    else if (!active && eventType === "REFUND") status = "refunded";
    else if (!active && eventType === "EXPIRATION") status = "expired";

    return {
        user_id: userId,
        app_user_id: userId,
        entitlement_id: activeEntitlementIds.includes(FAMILY_ENTITLEMENT)
            ? FAMILY_ENTITLEMENT
            : activeEntitlementIds[0] ?? null,
        entitlement_ids: activeEntitlementIds,
        plan: planForProduct(productId),
        product_id: productId,
        status,
        expires_at: expiresAt,
        will_renew: active && !subscription?.unsubscribe_detected_at,
        store: subscription?.store ?? null,
        environment: subscription ? (subscription.is_sandbox ? "SANDBOX" : "PRODUCTION") : null,
        last_event_id: eventId,
        updated_at: new Date().toISOString(),
    };
}

export async function syncRevenueCatCustomer(
    client: SupabaseClient,
    userId: string,
    eventId: string | null = null,
    eventType?: string
) {
    if (!isSupabaseUserId(userId)) throw new Error("RevenueCat App User ID is not a Supabase UUID.");
    const { data: existing, error: existingError } = await client
        .from("billing_customers")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.is_admin === true) return existing as BillingMirrorRow;
    if (
        existing?.plan === "fleet"
        && ["active", "grace_period", "billing_issue", "cancelled"].includes(existing.status)
        && (!existing.expires_at || new Date(existing.expires_at).getTime() > Date.now())
    ) {
        return existing as BillingMirrorRow;
    }
    const subscriber = await fetchRevenueCatSubscriber(userId);
    const row = mirrorRowFromSubscriber(userId, subscriber, eventId, eventType);
    const { data, error } = await client.from("billing_customers").upsert(row, { onConflict: "user_id" }).select().single();
    if (error) throw error;
    return data as BillingMirrorRow;
}

export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
