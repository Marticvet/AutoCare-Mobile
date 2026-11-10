import { parsePasswordRecoveryLink, passwordRecoveryCallbackKey } from "../passwordRecoveryLink";

describe("parsePasswordRecoveryLink", () => {
    it("ignores unrelated links", () => {
        expect(parsePasswordRecoveryLink("autocare://open-reminder?id=1")).toEqual({ kind: "ignore" });
    });

    it("reads an implicit recovery session from the fragment", () => {
        expect(parsePasswordRecoveryLink("autocare://reset-password#access_token=access&refresh_token=refresh&type=recovery"))
            .toEqual({ kind: "session", accessToken: "access", refreshToken: "refresh" });
    });

    it("reads PKCE and token-hash callbacks", () => {
        expect(parsePasswordRecoveryLink("autocare://reset-password?code=abc123")).toEqual({ kind: "code", code: "abc123" });
        expect(parsePasswordRecoveryLink("autocare://reset-password?token_hash=hash123&type=recovery"))
            .toEqual({ kind: "tokenHash", tokenHash: "hash123" });
    });

    it("decodes Supabase errors from the fragment", () => {
        expect(parsePasswordRecoveryLink("autocare://reset-password#error=access_denied&error_description=Email+link+is+invalid+or+has+expired"))
            .toEqual({ kind: "error", message: "Email link is invalid or has expired" });
    });

    it("rejects incomplete, malformed, and lookalike recovery callbacks", () => {
        expect(parsePasswordRecoveryLink("autocare://reset-password"))
            .toEqual({ kind: "error", message: "This password reset link is incomplete or has expired." });
        expect(parsePasswordRecoveryLink("autocare://reset-password?access_token=only-one-token"))
            .toEqual({ kind: "error", message: "This password reset link is incomplete or has expired." });
        expect(parsePasswordRecoveryLink("autocare://reset-password.evil?code=not-a-recovery-link"))
            .toEqual({ kind: "ignore" });
    });

    it("creates an opaque in-memory key for each single-use recovery credential", () => {
        const code = parsePasswordRecoveryLink("autocare://reset-password?code=single-use-code");
        const tokenHash = parsePasswordRecoveryLink("autocare://reset-password?token_hash=single-use-hash&type=recovery");

        expect(passwordRecoveryCallbackKey(code)).toMatch(/^code:[a-z0-9]+$/);
        expect(passwordRecoveryCallbackKey(tokenHash)).toMatch(/^tokenHash:[a-z0-9]+$/);
        expect(passwordRecoveryCallbackKey(code)).not.toContain("single-use-code");
        expect(passwordRecoveryCallbackKey(tokenHash)).not.toContain("single-use-hash");
        expect(passwordRecoveryCallbackKey({ kind: "ignore" })).toBeNull();
    });
});
