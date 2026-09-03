import { parsePasswordRecoveryLink } from "../passwordRecoveryLink";

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
});
