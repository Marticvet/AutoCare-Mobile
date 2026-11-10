import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20261110000000_garage_invitation_email_delivery.sql"),
    "utf8"
);
const functionSource = readFileSync(
    resolve(process.cwd(), "supabase/functions/send-garage-invitation/index.ts"),
    "utf8"
);
const powerSyncConfig = readFileSync(
    resolve(process.cwd(), "powersync/sync-config.yaml"),
    "utf8"
);

describe("garage invitation delivery", () => {
    it("uses a short-lived server-side claim before emailing a pending invitation", () => {
        expect(migration).toContain("claim_garage_invitation_email");
        expect(migration).toContain("member.status = 'pending'");
        expect(migration).toContain("member.invitation_email_sent_at is null");
        expect(migration).toContain("public.billing_can_admin_garage(member.garage_id)");
        expect(migration).toContain("interval '5 minutes'");
    });

    it("keeps Resend credentials and membership delivery state on the server", () => {
        expect(functionSource).toContain('required("RESEND_API_KEY")');
        expect(functionSource).toContain("userClient.auth.getUser()");
        expect(functionSource).toContain("claim_garage_invitation_email");
        expect(functionSource).toContain("invitation_email_sent_at");
        expect(functionSource).toContain('"Idempotency-Key": `garage-invitation/${claim.id}`');
        expect(functionSource).not.toContain("EXPO_PUBLIC_RESEND");
    });

    it("syncs only the invited user's pending membership and its garage name", () => {
        expect(powerSyncConfig).toContain("Pending invitations need the garage name for the in-app inbox");
        expect(powerSyncConfig).toContain("WHERE membership.user_id = auth.user_id()\n            AND membership.status = 'pending'");
        expect(powerSyncConfig).toContain("WHERE user_id = auth.user_id()\n          AND status = 'pending'");
    });
});
