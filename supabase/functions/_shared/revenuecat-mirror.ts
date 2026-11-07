export const PLUS_ENTITLEMENT = "plus_features";
export const FAMILY_ENTITLEMENT = "shared_garage";

export type RevenueCatEntitlement = {
    expires_date?: string | null;
    product_identifier?: string | null;
};

export type RevenueCatSubscription = {
    expires_date?: string | null;
    store?: string | null;
    is_sandbox?: boolean;
    unsubscribe_detected_at?: string | null;
    billing_issues_detected_at?: string | null;
    grace_period_expires_date?: string | null;
};

export type RevenueCatSubscriberResponse = {
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
    // The fetched subscriber is authoritative, so an old event cannot disable
    // a newer active entitlement.
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
