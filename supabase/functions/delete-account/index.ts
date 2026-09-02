import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    try {
        const authorization = request.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
        const url = Deno.env.get("SUPABASE_URL");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!url || !anonKey || !serviceKey) throw new Error("Supabase function configuration is missing.");
        const { confirmation } = await request.json();
        if (confirmation !== "DELETE") return json({ error: "Explicit deletion confirmation is required" }, 400);
        const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
        const { data: { user }, error: authError } = await userClient.auth.getUser();
        if (authError || !user) return json({ error: "Invalid session" }, 401);
        const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
        const { data: documents } = await admin.from("vehicle_documents").select("storage_path").eq("user_id", user.id).not("storage_path", "is", null);
        const paths = (documents ?? []).map((entry) => entry.storage_path).filter(Boolean);
        for (let offset = 0; offset < paths.length; offset += 100) {
            const { error } = await admin.storage.from("vehicle-documents").remove(paths.slice(offset, offset + 100));
            if (error) console.error("Could not remove every account document", error.message);
        }
        const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
        if (deleteError) throw deleteError;
        return json({ deleted: true });
    } catch (error) {
        console.error("delete-account failed", error);
        return json({ error: error instanceof Error ? error.message : "Account deletion failed" }, 500);
    }
});

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
