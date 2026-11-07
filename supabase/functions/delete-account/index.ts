import { createClient } from "npm:@supabase/supabase-js@2";
import {
    claimRevenueCatDeletion,
    confirmRevenueCatDeletionAuthDeleted,
    createRevenueCatDeletionTombstone,
    enqueueRevenueCatDeletion,
    makeRevenueCatDeletionEligible,
    removePendingRevenueCatDeletion,
    recordRevenueCatDeletionOutcome,
} from "../_shared/revenuecat-deletion-queue.ts";
import { revenueCatAppUserIdForAuthenticatedUser } from "../_shared/revenuecat-deletion.ts";
import { runAccountDeletionWorkflow } from "../_shared/account-deletion-workflow.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST") return json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
    let authDeletionRequested = false;
    let authDeletionConfirmed = false;
    try {
        const authorization = request.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required", code: "AUTH_REQUIRED" }, 401);
        const url = Deno.env.get("SUPABASE_URL");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!url || !anonKey || !serviceKey) return json({ error: "Account deletion is temporarily unavailable.", code: "ACCOUNT_DELETION_UNAVAILABLE" }, 503);
        const { confirmation } = await request.json();
        if (confirmation !== "DELETE") return json({ error: "Explicit deletion confirmation is required", code: "EXPLICIT_CONFIRMATION_REQUIRED" }, 400);
        const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
        const { data: { user }, error: authError } = await userClient.auth.getUser();
        if (authError || !user) return json({ error: "Invalid session", code: "INVALID_SESSION" }, 401);
        const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
        const appUserId = revenueCatAppUserIdForAuthenticatedUser(user.id);
        let queuedDeletion: Awaited<ReturnType<typeof enqueueRevenueCatDeletion>> | null = null;
        const revenuecatDeletion = await runAccountDeletionWorkflow({
            createTombstone: () => createRevenueCatDeletionTombstone(admin, appUserId),
            createQueue: async () => { queuedDeletion = await enqueueRevenueCatDeletion(admin, appUserId); },
            deleteAccountData: async () => {
                const { data: documents, error: documentsError } = await admin
                    .from("vehicle_documents")
                    .select("storage_path")
                    .eq("user_id", user.id)
                    .not("storage_path", "is", null);
                if (documentsError) throw new Error("Could not prepare vehicle-document deletion.");
                const paths = (documents ?? []).map((entry) => entry.storage_path).filter(Boolean);
                for (let offset = 0; offset < paths.length; offset += 100) {
                    const { error } = await admin.storage.from("vehicle-documents").remove(paths.slice(offset, offset + 100));
                    if (error) throw new Error("Could not remove vehicle documents.");
                }
            },
            deleteAuthUser: async () => {
                const { error } = await admin.auth.admin.deleteUser(user.id);
                if (error) throw error;
                authDeletionRequested = true;
            },
            confirmAuthUserDeleted: async () => {
                await confirmAuthUserDeleted(admin, user.id);
                authDeletionConfirmed = true;
            },
            markRevenueCatEligible: async () => {
                await confirmRevenueCatDeletionAuthDeleted(admin, appUserId);
                if (!queuedDeletion) throw new Error("RevenueCat deletion request is missing.");
                queuedDeletion = await makeRevenueCatDeletionEligible(admin, queuedDeletion.id);
            },
            requestRevenueCatDeletion: async () => {
                if (!queuedDeletion) throw new Error("RevenueCat deletion request is missing.");
                const claimedDeletion = await claimRevenueCatDeletion(admin, queuedDeletion.id);
                const outcome = claimedDeletion
                    ? await recordRevenueCatDeletionOutcome(admin, claimedDeletion, Deno.env.get("REVENUECAT_SECRET_API_KEY"))
                    : null;
                return outcome?.kind === "confirmed"
                    ? "confirmed"
                    : outcome?.kind === "requested"
                        ? "requested"
                        : outcome?.kind === "failed"
                            ? "needs_attention"
                            : "pending";
            },
            rollbackPendingDeletion: async () => {
                try {
                    await removePendingRevenueCatDeletion(admin, appUserId);
                } catch {
                    // The tombstone remains fail-closed if its cleanup cannot
                    // be persisted. It prevents RevenueCat recreation until an
                    // operator resolves the failed deletion transaction.
                    console.error("Could not roll back pending account deletion state");
                }
            },
        });
        return json({ deleted: true, revenuecat_deletion: revenuecatDeletion });
    } catch (error) {
        console.error("delete-account failed", error);
        if (authDeletionConfirmed) {
            // The user can no longer authenticate. Preserve the tombstone and
            // let the retry worker finish RevenueCat deletion rather than
            // returning an error that causes the device to restore this ID.
            return json({
                deleted: true,
                revenuecat_deletion: "pending",
                code: "ACCOUNT_DELETED_REVENUECAT_PENDING",
            }, 202);
        }
        if (authDeletionRequested) {
            // Auth deletion may have succeeded even though its confirmation
            // call failed. The client must clear local access and must never
            // restore the RevenueCat identity in this state.
            return json({
                error: "We could not confirm the account deletion state. Sign in again only if the account is still available.",
                code: "ACCOUNT_DELETION_STATE_UNKNOWN",
            }, 409);
        }
        return json({ error: "Account deletion could not be completed. No account deletion was confirmed.", code: "ACCOUNT_DELETION_FAILED" }, 500);
    }
});

async function confirmAuthUserDeleted(admin: ReturnType<typeof createClient>, userId: string) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (data.user || error?.status !== 404) {
        throw new Error("Supabase Auth deletion could not be confirmed.");
    }
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
