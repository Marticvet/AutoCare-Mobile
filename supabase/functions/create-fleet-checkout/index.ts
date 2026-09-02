import { createClient } from "npm:@supabase/supabase-js@2";
import { adminClient, corsHeaders } from "../_shared/billing.ts";

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
        const authorization = request.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
        const url = required("SUPABASE_URL");
        const anonKey = required("SUPABASE_ANON_KEY");
        const userClient = createClient(url, anonKey, {
            global: { headers: { Authorization: authorization } },
            auth: { persistSession: false },
        });
        const { data: { user }, error: authError } = await userClient.auth.getUser();
        if (authError || !user) return json({ error: "Invalid session" }, 401);

        const body = await request.json() as { garageId?: string; vehicles?: number; members?: number };
        if (!body.garageId) return json({ error: "garageId is required" }, 400);
        const vehicles = integerInRange(body.vehicles, 1, 1000, 1);
        const members = integerInRange(body.members, 1, 5000, 1);
        const { data: allowed, error: accessError } = await userClient.rpc("billing_can_admin_garage", {
            target_garage_id: body.garageId,
        });
        if (accessError) throw accessError;
        if (!allowed) return json({ error: "You cannot manage this garage" }, 403);

        const admin = adminClient();
        const { data: garage, error: garageError } = await admin
            .from("garages")
            .select("id, owner_user_id")
            .eq("id", body.garageId)
            .single();
        if (garageError) throw garageError;
        const { data: fleet } = await admin
            .from("fleet_billing_accounts")
            .select("stripe_customer_id")
            .eq("garage_id", body.garageId)
            .maybeSingle();

        const params = new URLSearchParams({
            mode: "subscription",
            success_url: required("FLEET_SUCCESS_URL"),
            cancel_url: required("FLEET_CANCEL_URL"),
            client_reference_id: body.garageId,
            allow_promotion_codes: "true",
            "metadata[garage_id]": body.garageId,
            "metadata[owner_user_id]": garage.owner_user_id,
            "metadata[licensed_vehicles]": String(vehicles),
            "metadata[licensed_members]": String(members),
            "subscription_data[metadata][garage_id]": body.garageId,
            "subscription_data[metadata][owner_user_id]": garage.owner_user_id,
            "subscription_data[metadata][licensed_vehicles]": String(vehicles),
            "subscription_data[metadata][licensed_members]": String(members),
            "line_items[0][price]": required("STRIPE_FLEET_VEHICLE_PRICE_ID"),
            "line_items[0][quantity]": String(vehicles),
        });
        const memberPrice = Deno.env.get("STRIPE_FLEET_MEMBER_PRICE_ID");
        if (memberPrice) {
            params.set("line_items[1][price]", memberPrice);
            params.set("line_items[1][quantity]", String(members));
        }
        if (fleet?.stripe_customer_id) params.set("customer", fleet.stripe_customer_id);
        else if (user.email) params.set("customer_email", user.email);

        const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${required("STRIPE_SECRET_KEY")}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params,
        });
        const session = await response.json() as { id?: string; url?: string; error?: { message?: string } };
        if (!response.ok || !session.url) throw new Error(session.error?.message ?? `Stripe returned ${response.status}`);
        return json({ checkoutUrl: session.url, sessionId: session.id });
    } catch (error) {
        console.error("create-fleet-checkout failed", error);
        return json({ error: error instanceof Error ? error.message : "Fleet checkout could not be created" }, 500);
    }
});

function integerInRange(value: unknown, min: number, max: number, fallback: number) {
    const parsed = Number(value ?? fallback);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`Quantity must be between ${min} and ${max}.`);
    return parsed;
}

function required(name: string) {
    const value = Deno.env.get(name);
    if (!value) throw new Error(`${name} is missing.`);
    return value;
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
