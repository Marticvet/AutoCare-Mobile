import { createClient } from "npm:@supabase/supabase-js@2";
import { adminClient, corsHeaders } from "../_shared/billing.ts";

type ClaimedInvitation = {
    id: string;
    garage_id: string;
    email: string;
    role: string;
    invitation_email_delivery_token: string;
};

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    let claim: ClaimedInvitation | null = null;
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

        const body = await request.json() as { membershipId?: unknown };
        if (typeof body.membershipId !== "string" || !isUuid(body.membershipId)) {
            return json({ error: "membershipId is required" }, 400);
        }

        const { data: claimData, error: claimError } = await userClient.rpc(
            "claim_garage_invitation_email",
            { target_membership_id: body.membershipId }
        );
        if (claimError) throw claimError;
        claim = (Array.isArray(claimData) ? claimData[0] : claimData) as ClaimedInvitation | null;
        // A previously delivered or in-progress invitation is deliberately a
        // successful no-op, preventing duplicate messages on retries.
        if (!claim) return json({ delivered: false, reason: "already_delivered_or_ineligible" });

        const admin = adminClient();
        const { data: garage, error: garageError } = await admin
            .from("garages")
            .select("name")
            .eq("id", claim.garage_id)
            .single();
        if (garageError || !garage) throw garageError ?? new Error("garage_not_found");

        const resendKey = required("RESEND_API_KEY");
        const from = Deno.env.get("GARAGE_INVITATION_FROM_EMAIL") || "AutoCare Hub <no-reply@autocare.builtfurther.com>";
        const mail = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
                // Stable across a retried database claim, including the rare
                // case where Resend accepts mail just before our DB update.
                "Idempotency-Key": `garage-invitation/${claim.id}`,
            },
            body: JSON.stringify({
                from,
                to: [claim.email],
                subject: `You're invited to ${garage.name} in AutoCare Hub`,
                html: invitationHtml(garage.name, claim.email, claim.role),
                text: invitationText(garage.name, claim.email, claim.role),
            }),
        });
        if (!mail.ok) throw new Error(`email_provider_${mail.status}`);

        const { error: deliveredError } = await admin
            .from("garage_memberships")
            .update({
                invitation_email_sent_at: new Date().toISOString(),
                invitation_email_delivery_token: null,
            })
            .eq("id", claim.id)
            .eq("invitation_email_delivery_token", claim.invitation_email_delivery_token);
        if (deliveredError) throw deliveredError;
        return json({ delivered: true });
    } catch (error) {
        // Do not log authorization headers, provider responses, email
        // addresses, or membership identifiers.
        console.error("send-garage-invitation failed", error instanceof Error ? error.message : "unknown_error");
        if (claim) {
            try {
                await adminClient()
                    .from("garage_memberships")
                    .update({ invitation_email_delivery_token: null, invitation_email_delivery_attempted_at: null })
                    .eq("id", claim.id)
                    .eq("invitation_email_delivery_token", claim.invitation_email_delivery_token);
            } catch {
                // A short-lived claim prevents concurrent duplicate sends; it
                // is eligible for retry after five minutes even if clearing it fails.
            }
        }
        return json({ error: "Invitation email could not be sent" }, 502);
    }
});

function invitationText(garageName: string, email: string, role: string) {
    return `You are invited to ${garageName} as a ${role} in AutoCare Hub. Open AutoCare Hub and sign in or create an account with ${email}. Then open Garage members to accept or decline the pending invitation.`;
}

function invitationHtml(garageName: string, email: string, role: string) {
    const safeGarage = escapeHtml(garageName);
    const safeEmail = escapeHtml(email);
    const safeRole = escapeHtml(role);
    return `<!doctype html><html lang="en"><body style="margin:0;background:#f6f8fb;color:#172033;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><main style="max-width:560px;margin:0 auto;padding:32px 20px"><section style="background:#ffffff;border-radius:16px;padding:32px"><p style="margin:0 0 20px;color:#2563eb;font-weight:700">AutoCare Hub</p><h1 style="margin:0 0 16px;font-size:24px">You’re invited to ${safeGarage}</h1><p style="line-height:1.55">You’ve been invited as a ${safeRole} in a shared garage.</p><p style="line-height:1.55">Open AutoCare Hub and sign in or create an account with <strong>${safeEmail}</strong>. Then open <strong>Garage members</strong> to accept or decline the pending invitation.</p><p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.5">This email does not grant access by itself. The invitation remains pending until it is accepted from the invited AutoCare Hub account.</p></section></main></body></html>`;
}

function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
}

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function required(name: string) {
    const value = Deno.env.get(name);
    if (!value) throw new Error(`${name} is missing`);
    return value;
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
