const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const REVENUECAT_DELETION_CONFIRMATION_DELAY_MS = 5 * 60 * 1000;

export type RevenueCatDeletionResult =
    | { kind: "requested"; status: 200 }
    | { kind: "confirmed"; status: 404 }
    | { kind: "retry"; status?: number; errorCode: "unavailable" | "rate_limited" | "conflict"; retryAfterMs: number }
    | { kind: "failed"; status?: number; errorCode: "not_configured" | "unauthorized" | "invalid_request" | "unexpected_response" };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * AutoCare configures RevenueCat with the authenticated Supabase UUID. Do not
 * accept an App User ID from a request body: that would permit deleting a
 * different customer's RevenueCat profile.
 */
export function revenueCatAppUserIdForAuthenticatedUser(userId: unknown) {
    if (typeof userId !== "string" || !UUID_PATTERN.test(userId)) {
        throw new Error("The authenticated account has an invalid RevenueCat identity.");
    }
    return userId;
}

export function retryDelayMs(attempt: number, retryAfterHeader: string | null = null) {
    const exponent = Math.max(0, Math.min(attempt - 1, 11));
    const exponential = Math.min(24 * 60 * 60 * 1000, 60 * 1000 * (2 ** exponent));
    const retryAfterSeconds = Number(retryAfterHeader);
    const retryAfter = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? Math.min(24 * 60 * 60 * 1000, retryAfterSeconds * 1000)
        : 0;
    return Math.max(exponential, retryAfter);
}

export async function requestRevenueCatCustomerDeletion({
    appUserId,
    secretApiKey,
    attempt,
    fetcher = fetch,
}: {
    appUserId: string;
    secretApiKey: string | undefined;
    attempt: number;
    fetcher?: FetchLike;
}): Promise<RevenueCatDeletionResult> {
    const authenticatedId = revenueCatAppUserIdForAuthenticatedUser(appUserId);
    if (!secretApiKey) return { kind: "failed", errorCode: "not_configured" };

    try {
        const response = await fetcher(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(authenticatedId)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${secretApiKey}`, Accept: "application/json" },
        });
        if (response.status === 200) return { kind: "requested", status: 200 };
        if (response.status === 404) return { kind: "confirmed", status: 404 };

        if ([408, 409, 423, 429, 500, 502, 503, 504].includes(response.status)) {
            return {
                kind: "retry",
                status: response.status,
                errorCode: response.status === 429 ? "rate_limited" : response.status === 409 || response.status === 423 ? "conflict" : "unavailable",
                retryAfterMs: retryDelayMs(attempt, response.headers.get("Retry-After")),
            };
        }
        return {
            kind: "failed",
            status: response.status,
            errorCode: response.status === 401 || response.status === 403 ? "unauthorized" : response.status >= 400 && response.status < 500 ? "invalid_request" : "unexpected_response",
        };
    } catch {
        return {
            kind: "retry",
            errorCode: "unavailable",
            retryAfterMs: retryDelayMs(attempt),
        };
    }
}
