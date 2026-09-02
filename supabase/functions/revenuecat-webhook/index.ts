import { adminClient, isSupabaseUserId, syncRevenueCatCustomer } from "../_shared/billing.ts";

type RevenueCatEvent = {
    id?: string;
    type?: string;
    app_user_id?: string;
    original_app_user_id?: string;
    aliases?: string[];
    transferred_from?: string[];
    transferred_to?: string[];
};

Deno.serve(async (request) => {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const rawBody = await request.text();

    try {
        await verifyRequest(request, rawBody);
        const payload = JSON.parse(rawBody) as { event?: RevenueCatEvent };
        const event = payload.event;
        if (!event?.id || !event.type) return json({ error: "Invalid RevenueCat event" }, 400);

        const client = adminClient();
        const { data: existing } = await client.from("billing_webhook_events").select("processed_at").eq("event_id", event.id).maybeSingle();
        if (existing?.processed_at) return json({ received: true, duplicate: true });

        if (!existing) {
            const { error: insertError } = await client.from("billing_webhook_events").insert({
                event_id: event.id,
                event_type: event.type,
                app_user_id: event.app_user_id ?? null,
                payload,
            });
            if (insertError && insertError.code !== "23505") throw insertError;
        }

        try {
            const userIds = eventUserIds(event);
            if (userIds.length === 0) throw new Error("Webhook does not contain a Supabase UUID App User ID.");
            for (const userId of userIds) await syncRevenueCatCustomer(client, userId, event.id, event.type);
            await client.from("billing_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("event_id", event.id);
            return json({ received: true });
        } catch (processingError) {
            await client.from("billing_webhook_events").update({ processing_error: processingError instanceof Error ? processingError.message : "Unknown processing error" }).eq("event_id", event.id);
            throw processingError;
        }
    } catch (error) {
        console.error("revenuecat-webhook failed", error);
        const message = error instanceof Error ? error.message : "Webhook processing failed";
        const unauthorized = /authorization|signature|timestamp/i.test(message);
        return json({ error: message }, unauthorized ? 401 : 500);
    }
});

function eventUserIds(event: RevenueCatEvent) {
    const candidates = event.type === "TRANSFER"
        ? [...(event.transferred_from ?? []), ...(event.transferred_to ?? [])]
        : [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
    return [...new Set(candidates.filter(isSupabaseUserId))];
}

async function verifyRequest(request: Request, rawBody: string) {
    const expectedAuthorization = Deno.env.get("REVENUECAT_WEBHOOK_AUTHORIZATION");
    const signingSecret = Deno.env.get("REVENUECAT_WEBHOOK_SIGNING_SECRET");
    if (!expectedAuthorization || !signingSecret) throw new Error("Webhook authorization and signing secrets must be configured.");
    if (!constantTimeEqual(request.headers.get("Authorization") ?? "", expectedAuthorization)) throw new Error("Invalid webhook authorization.");

    const signatureHeader = request.headers.get("X-RevenueCat-Webhook-Signature") ?? "";
    const parts = Object.fromEntries(signatureHeader.split(",").map((part) => part.split("=", 2)));
    const timestamp = parts.t;
    const provided = parts.v1;
    if (!timestamp || !provided || !/^\d+$/.test(timestamp)) throw new Error("Invalid webhook signature header.");
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error("Webhook signature timestamp is outside the allowed window.");

    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(signingSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
    const expected = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    if (!constantTimeEqual(provided, expected)) throw new Error("Invalid webhook signature.");
}

function constantTimeEqual(left: string, right: string) {
    const size = Math.max(left.length, right.length);
    let difference = left.length ^ right.length;
    for (let index = 0; index < size; index += 1) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
    return difference === 0;
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
