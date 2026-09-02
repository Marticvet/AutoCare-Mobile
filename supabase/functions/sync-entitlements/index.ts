import { createClient } from "npm:@supabase/supabase-js@2";
import { adminClient, corsHeaders, syncRevenueCatCustomer } from "../_shared/billing.ts";

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
        const authorization = request.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

        const url = Deno.env.get("SUPABASE_URL");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        if (!url || !anonKey) throw new Error("Supabase function configuration is missing.");
        const userClient = createClient(url, anonKey, {
            global: { headers: { Authorization: authorization } },
            auth: { persistSession: false },
        });
        const { data: { user }, error: authError } = await userClient.auth.getUser();
        if (authError || !user) return json({ error: "Invalid session" }, 401);

        const row = await syncRevenueCatCustomer(adminClient(), user.id);
        return json({ billing: sanitize(row) });
    } catch (error) {
        console.error("sync-entitlements failed", error);
        return json({ error: error instanceof Error ? error.message : "Entitlement sync failed" }, 500);
    }
});

function sanitize(row: Record<string, unknown>) {
    const { last_event_id: _lastEventId, app_user_id: _appUserId, ...safe } = row;
    return safe;
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
