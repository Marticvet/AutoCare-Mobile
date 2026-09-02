import { adminClient } from "../_shared/billing.ts";

type StripeEvent = {
    id: string;
    type: string;
    livemode?: boolean;
    data: { object: StripeObject };
};

type StripeObject = {
    id?: string;
    customer?: string;
    subscription?: string;
    status?: string;
    current_period_end?: number;
    cancel_at_period_end?: boolean;
    currency?: string;
    amount_total?: number;
    metadata?: Record<string, string>;
    items?: { data?: Array<{ quantity?: number; price?: { id?: string; unit_amount?: number; currency?: string } }> };
};

Deno.serve(async (request) => {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const rawBody = await request.text();
    try {
        await verifyStripeSignature(request.headers.get("stripe-signature") ?? "", rawBody, required("STRIPE_WEBHOOK_SECRET"));
        const event = JSON.parse(rawBody) as StripeEvent;
        if (!event.id || !event.type || !event.data?.object) return json({ error: "Invalid Stripe event" }, 400);
        const client = adminClient();
        const { data: existing } = await client.from("billing_webhook_events").select("processed_at").eq("event_id", event.id).maybeSingle();
        if (existing?.processed_at) return json({ received: true, duplicate: true });
        if (!existing) {
            const { error: insertError } = await client.from("billing_webhook_events").insert({
                event_id: event.id,
                event_type: `stripe.${event.type}`,
                app_user_id: event.data.object.metadata?.owner_user_id ?? null,
                payload: event,
            });
            if (insertError && insertError.code !== "23505") throw insertError;
        }
        try {
            if (event.type === "checkout.session.completed" || event.type.startsWith("customer.subscription.")) {
                await mirrorFleetEvent(event);
            }
            await client.from("billing_webhook_events").update({
                processed_at: new Date().toISOString(),
                processing_error: null,
            }).eq("event_id", event.id);
            return json({ received: true });
        } catch (processingError) {
            await client.from("billing_webhook_events").update({
                processing_error: processingError instanceof Error ? processingError.message : "Unknown processing error",
            }).eq("event_id", event.id);
            throw processingError;
        }
    } catch (error) {
        console.error("stripe-webhook failed", error);
        const message = error instanceof Error ? error.message : "Stripe webhook processing failed";
        return json({ error: message }, /signature|timestamp/i.test(message) ? 401 : 500);
    }
});

async function mirrorFleetEvent(event: StripeEvent) {
    const object = event.data.object;
    const metadata = object.metadata ?? {};
    const garageId = metadata.garage_id;
    if (!garageId) throw new Error("Stripe object is missing garage_id metadata.");
    const client = adminClient();
    const { data: garage, error: garageError } = await client.from("garages").select("owner_user_id").eq("id", garageId).single();
    if (garageError) throw garageError;

    const isCheckout = event.type === "checkout.session.completed";
    const rawStatus = isCheckout ? "active" : object.status ?? "inactive";
    const fleetStatus = fleetStatusFromStripe(rawStatus);
    const billingStatus = billingStatusFromStripe(rawStatus);
    const items = object.items?.data ?? [];
    const vehicles = positiveInteger(metadata.licensed_vehicles, items[0]?.quantity, 1);
    const members = positiveInteger(metadata.licensed_members, items[1]?.quantity, 1);
    const periodEnd = object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : null;
    const subscriptionId = isCheckout ? object.subscription ?? null : object.id ?? null;
    const customerId = object.customer ?? null;
    const productId = items.map((item) => item.price?.id).filter(Boolean).join(",") || null;
    const unitAmount = items.reduce((sum, item) => sum + (item.price?.unit_amount ?? 0), 0) || object.amount_total || null;
    const currency = items.find((item) => item.price?.currency)?.price?.currency ?? object.currency ?? "eur";
    const active = ["trialing", "active", "past_due"].includes(fleetStatus);

    const { error: fleetError } = await client.from("fleet_billing_accounts").upsert({
        garage_id: garageId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status: fleetStatus,
        licensed_vehicles: vehicles,
        licensed_members: members,
        currency,
        unit_amount: unitAmount,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
    }, { onConflict: "garage_id" });
    if (fleetError) throw fleetError;

    const { error: garageUpdateError } = await client.from("garages").update({
        kind: "fleet",
        status: active ? "active" : "suspended",
        seat_limit: members,
        vehicle_limit: vehicles,
        updated_at: new Date().toISOString(),
    }).eq("id", garageId);
    if (garageUpdateError) throw garageUpdateError;

    const { error: billingError } = await client.from("billing_customers").upsert({
        user_id: garage.owner_user_id,
        app_user_id: garage.owner_user_id,
        entitlement_id: active ? "shared_garage" : null,
        entitlement_ids: active ? ["plus_features", "shared_garage"] : [],
        plan: "fleet",
        product_id: productId,
        status: billingStatus,
        expires_at: periodEnd,
        will_renew: active && !object.cancel_at_period_end,
        store: "stripe",
        environment: event.livemode ? "PRODUCTION" : "SANDBOX",
        last_event_id: event.id,
        updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (billingError) throw billingError;
}

function fleetStatusFromStripe(status: string) {
    if (status === "trialing") return "trialing";
    if (status === "active") return "active";
    if (status === "past_due") return "past_due";
    if (status === "canceled" || status === "unpaid") return "cancelled";
    return "inactive";
}

function billingStatusFromStripe(status: string) {
    if (status === "trialing" || status === "active") return "active";
    if (status === "past_due") return "billing_issue";
    if (status === "canceled") return "cancelled";
    return "expired";
}

function positiveInteger(...values: unknown[]) {
    for (const value of values) {
        const parsed = Number(value);
        if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
    return 1;
}

async function verifyStripeSignature(header: string, body: string, secret: string) {
    const entries = header.split(",").map((entry) => entry.split("=", 2));
    const timestamp = entries.find(([key]) => key === "t")?.[1];
    const signatures = entries.filter(([key]) => key === "v1").map(([, value]) => value);
    if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) throw new Error("Invalid Stripe signature header.");
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error("Stripe signature timestamp is outside the allowed window.");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
    const expected = [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    if (!signatures.some((signature) => constantTimeEqual(signature, expected))) throw new Error("Invalid Stripe signature.");
}

function constantTimeEqual(left: string, right: string) {
    const leftBytes = new TextEncoder().encode(left);
    const rightBytes = new TextEncoder().encode(right);
    if (leftBytes.length !== rightBytes.length) return false;
    let difference = 0;
    for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
    return difference === 0;
}

function required(name: string) {
    const value = Deno.env.get(name);
    if (!value) throw new Error(`${name} is missing.`);
    return value;
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
