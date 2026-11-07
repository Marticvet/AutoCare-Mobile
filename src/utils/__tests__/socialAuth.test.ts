import {
    SOCIAL_AUTH_REDIRECT_URL,
    exchangeSocialAuthCode,
    isSocialAuthCancellation,
    parseSocialAuthCallback,
    socialOAuthAuthorizationOptions,
} from "../socialAuth";

describe("social authentication callbacks", () => {
    it("accepts only the registered callback and preserves the PKCE code", () => {
        expect(parseSocialAuthCallback(`${SOCIAL_AUTH_REDIRECT_URL}?code=one-time-code`))
            .toEqual({ kind: "code", code: "one-time-code" });
        expect(parseSocialAuthCallback("autocare://reset-password?code=not-social"))
            .toEqual({ kind: "ignore" });
    });

    it("rejects token-bearing callbacks so PKCE tokens never reach the app URL", () => {
        expect(parseSocialAuthCallback(`${SOCIAL_AUTH_REDIRECT_URL}#access_token=access&refresh_token=refresh`))
            .toEqual({ kind: "error", message: "social_auth_callback_incomplete" });
        expect(parseSocialAuthCallback(`${SOCIAL_AUTH_REDIRECT_URL}#access_token=access`))
            .toEqual({ kind: "error", message: "social_auth_callback_incomplete" });
    });

    it("keeps a provider cancellation distinct from a failed authentication", () => {
        expect(parseSocialAuthCallback(`${SOCIAL_AUTH_REDIRECT_URL}?error=access_denied`))
            .toEqual({ kind: "cancelled" });
        expect(parseSocialAuthCallback(`${SOCIAL_AUTH_REDIRECT_URL}?error=server_error&error_description=Try+again`))
            .toEqual({ kind: "error", message: "Try again" });
        expect(isSocialAuthCancellation({ code: "ERR_REQUEST_CANCELED" })).toBe(true);
        expect(isSocialAuthCancellation(new Error("network"))).toBe(false);
    });

    it("requests Google account selection for sign-in and identity-link OAuth", () => {
        expect(socialOAuthAuthorizationOptions("google")).toEqual({
            redirectTo: SOCIAL_AUTH_REDIRECT_URL,
            skipBrowserRedirect: true,
            queryParams: { prompt: "select_account" },
        });
        expect(socialOAuthAuthorizationOptions("apple")).toEqual({
            redirectTo: SOCIAL_AUTH_REDIRECT_URL,
            skipBrowserRedirect: true,
        });
    });

    it("rejects incomplete callbacks instead of creating a session", () => {
        expect(parseSocialAuthCallback(`${SOCIAL_AUTH_REDIRECT_URL}?state=missing-code`))
            .toEqual({ kind: "error", message: "social_auth_callback_incomplete" });
    });

    it("exchanges a valid PKCE code into a session", async () => {
        const exchange = jest.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });

        await expect(exchangeSocialAuthCode("one-time-code", exchange))
            .resolves.toEqual({ kind: "success", session: { user: { id: "user-1" } } });
        expect(exchange).toHaveBeenCalledWith("one-time-code");
    });

    it("handles expired, invalid, and network-failed codes without a session", async () => {
        await expect(exchangeSocialAuthCode("expired", async () => ({
            data: { session: null },
            error: { message: "code expired" },
        }))).resolves.toEqual({ kind: "failure" });
        await expect(exchangeSocialAuthCode("invalid", async () => ({
            data: { session: null },
            error: null,
        }))).resolves.toEqual({ kind: "failure" });
        await expect(exchangeSocialAuthCode("network", async () => {
            throw new Error("offline");
        })).resolves.toEqual({ kind: "failure" });
    });
});
