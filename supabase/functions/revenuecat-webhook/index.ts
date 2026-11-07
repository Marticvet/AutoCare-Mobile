import { adminClient, syncRevenueCatCustomer } from "../_shared/billing.ts";
import {
    RevenueCatWebhookAuthenticationError,
    type RevenueCatWebhookEvent,
    revenueCatEventUserIds,
    verifyRevenueCatWebhook,
} from "../_shared/revenuecat-webhook.ts";
import { processRevenueCatWebhookUsers } from "../_shared/revenuecat-webhook-processing.ts";

Deno.serve(async (request) => {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const rawBody = await request.text();

    try {
        await verifyRequest(request, rawBody);
        const payload = JSON.parse(rawBody) as { event?: RevenueCatWebhookEvent };
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
            const userIds = revenueCatEventUserIds(event);
            if (userIds.length === 0) throw new Error("Webhook does not contain a Supabase UUID App User ID.");
            const { ignoredDeletedAccount } = await processRevenueCatWebhookUsers(
                userIds,
                (userId) => syncRevenueCatCustomer(client, userId, event.id, event.type)
            );
            await client.from("billing_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("event_id", event.id);
            // A confirmed tombstone intentionally consumes late deliveries so
            // the provider does not retry and trigger a later recreation.
            return json({ received: true, ignored: ignoredDeletedAccount });
        } catch (processingError) {
            await client.from("billing_webhook_events").update({ processing_error: processingError instanceof Error ? processingError.message : "Unknown processing error" }).eq("event_id", event.id);
            throw processingError;
        }
    } catch (error) {
        const status = error instanceof RevenueCatWebhookAuthenticationError ? 401 : 500;
        // Do not log raw webhook payloads or return internal secret/database
        // details to a caller. RevenueCat retries non-2xx responses.
        console.error("revenuecat-webhook failed", { status });
        return json({ error: status === 401 ? "Unauthorized webhook." : "Webhook processing failed." }, status);
    }
});

async function verifyRequest(request: Request, rawBody: string) {
    await verifyRevenueCatWebhook({
        authorization: request.headers.get("Authorization") ?? "",
        expectedAuthorization: Deno.env.get("REVENUECAT_WEBHOOK_AUTHORIZATION"),
        signatureHeader: request.headers.get("X-RevenueCat-Webhook-Signature") ?? "",
        signingSecret: Deno.env.get("REVENUECAT_WEBHOOK_SIGNING_SECRET"),
        rawBody,
        hmacSha256: async (message, secret) => {
            const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
            const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
            return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
        },
    });
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
