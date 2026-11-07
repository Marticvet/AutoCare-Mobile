export type SocialProvider = "apple" | "google";

export const SOCIAL_AUTH_REDIRECT_URL = "autocare://auth/callback";

export type SocialAuthCallback =
    | { kind: "ignore" }
    | { kind: "cancelled" }
    | { kind: "error"; message: string }
    | { kind: "code"; code: string };

type OAuthExchangeResult<TSession> = {
    data: { session: TSession | null };
    error: { message: string } | null;
};

export type OAuthCodeExchange<TSession> =
    | { kind: "success"; session: TSession }
    | { kind: "failure" };

/**
 * Shared by OAuth sign-in and identity linking. Google must ask which account
 * to use rather than silently reuse the browser's previous Google session.
 * This only affects the provider authorization page; it never chooses or
 * merges an AutoCare identity.
 */
export function socialOAuthAuthorizationOptions(provider: SocialProvider) {
    const options = {
        redirectTo: SOCIAL_AUTH_REDIRECT_URL,
        skipBrowserRedirect: true,
    };

    return provider === "google"
        ? { ...options, queryParams: { prompt: "select_account" } }
        : options;
}

function decode(value: string) {
    try {
        return decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
        return value;
    }
}

function queryParams(url: string) {
    const queryStart = url.indexOf("?");
    const hashStart = url.indexOf("#");
    const segments = [
        queryStart >= 0 ? url.slice(queryStart + 1, hashStart >= 0 ? hashStart : undefined) : "",
        hashStart >= 0 ? url.slice(hashStart + 1) : "",
    ];
    const values = new Map<string, string>();

    segments.join("&").split("&").forEach((entry) => {
        if (!entry) return;
        const separator = entry.indexOf("=");
        values.set(
            decode(separator >= 0 ? entry.slice(0, separator) : entry),
            decode(separator >= 0 ? entry.slice(separator + 1) : "")
        );
    });
    return values;
}

/** Parses only the exact redirect URI registered for the social OAuth flow. */
export function parseSocialAuthCallback(url: string): SocialAuthCallback {
    if (!url.startsWith(`${SOCIAL_AUTH_REDIRECT_URL}?`) && !url.startsWith(`${SOCIAL_AUTH_REDIRECT_URL}#`)) {
        return { kind: "ignore" };
    }

    const params = queryParams(url);
    const error = params.get("error_description") || params.get("error");
    if (error === "access_denied" || error === "user_cancelled") return { kind: "cancelled" };
    if (error) return { kind: "error", message: error };

    const code = params.get("code");
    if (code) return { kind: "code", code };
    return { kind: "error", message: "social_auth_callback_incomplete" };
}

/**
 * Exchanges only an OAuth authorization code. Authentication failures and
 * transport errors deliberately collapse to a safe, localized client error;
 * no partial session is exposed to the app.
 */
export async function exchangeSocialAuthCode<TSession>(
    code: string,
    exchangeCodeForSession: (code: string) => Promise<OAuthExchangeResult<TSession>>
): Promise<OAuthCodeExchange<TSession>> {
    try {
        const result = await exchangeCodeForSession(code);
        if (result.error || !result.data.session) return { kind: "failure" };
        return { kind: "success", session: result.data.session };
    } catch {
        return { kind: "failure" };
    }
}

export function isSocialAuthCancellation(error: unknown) {
    const code = (error as { code?: unknown } | null)?.code;
    return code === "ERR_REQUEST_CANCELED" || code === "ERR_CANCELED";
}
