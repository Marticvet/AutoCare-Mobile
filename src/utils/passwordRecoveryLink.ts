export type PasswordRecoveryLink =
    | { kind: "ignore" }
    | { kind: "error"; message: string }
    | { kind: "session"; accessToken: string; refreshToken: string }
    | { kind: "code"; code: string }
    | { kind: "tokenHash"; tokenHash: string };

const RECOVERY_URL = /^autocare:\/\/reset-password(?:[/?#]|$)/i;

function decode(value: string) {
    try {
        return decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
        return value;
    }
}

function getParams(url: string) {
    const params = new Map<string, string>();
    const queryStart = url.indexOf("?");
    const hashStart = url.indexOf("#");
    const segments: string[] = [];

    if (queryStart >= 0) {
        segments.push(url.slice(queryStart + 1, hashStart >= 0 ? hashStart : undefined));
    }
    if (hashStart >= 0) segments.push(url.slice(hashStart + 1));

    segments.forEach((segment) => {
        segment.split("&").forEach((entry) => {
            if (!entry) return;
            const separator = entry.indexOf("=");
            const key = decode(separator >= 0 ? entry.slice(0, separator) : entry);
            const value = decode(separator >= 0 ? entry.slice(separator + 1) : "");
            params.set(key, value);
        });
    });

    return params;
}

export function parsePasswordRecoveryLink(url: string): PasswordRecoveryLink {
    if (!RECOVERY_URL.test(url)) return { kind: "ignore" };

    const params = getParams(url);
    const error = params.get("error_description") || params.get("error");
    if (error) return { kind: "error", message: error };

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken && refreshToken) return { kind: "session", accessToken, refreshToken };

    const code = params.get("code");
    if (code) return { kind: "code", code };

    const tokenHash = params.get("token_hash");
    if (tokenHash) return { kind: "tokenHash", tokenHash };

    return {
        kind: "error",
        message: "This password reset link is incomplete or has expired.",
    };
}

/**
 * A recovery code, token hash, or implicit session is single-use. Native iOS
 * can surface the same launch URL through both getInitialURL() and a Linking
 * event, so AuthProvider uses this opaque in-memory key to process it once.
 * It is never logged or persisted.
 */
export function passwordRecoveryCallbackKey(recovery: PasswordRecoveryLink) {
    const fingerprint = (value: string) => {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index += 1) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    };

    switch (recovery.kind) {
        case "session":
            return `session:${fingerprint(`${recovery.accessToken}:${recovery.refreshToken}`)}`;
        case "code":
            return `code:${fingerprint(recovery.code)}`;
        case "tokenHash":
            return `tokenHash:${fingerprint(recovery.tokenHash)}`;
        default:
            return null;
    }
}
