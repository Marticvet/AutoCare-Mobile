type RecoveryDiagnosticFields = Record<string, boolean | number | string | undefined>;

/**
 * Development-only recovery telemetry. Keep this deliberately structural: a
 * callback URL, email address, authorization code, token hash, password, and
 * session value must never reach the device log.
 */
export function logRecoveryDiagnostic(event: string, fields: RecoveryDiagnosticFields = {}) {
    if (!__DEV__) return;
    console.warn("[auth-recovery]", event, fields);
}

export function passwordRecoveryErrorCategory(error: unknown) {
    const candidate = error as { name?: unknown; code?: unknown; status?: unknown; message?: unknown };
    const name = typeof candidate?.name === "string" ? candidate.name.toLowerCase() : "";
    const code = typeof candidate?.code === "string" ? candidate.code.toLowerCase() : "";
    const message = typeof candidate?.message === "string" ? candidate.message.toLowerCase() : "";

    if (name.includes("pkce") || code.includes("pkce") || message.includes("code verifier")) {
        return "pkce_verifier_missing";
    }
    if (code.includes("otp_expired") || message.includes("expired")) return "expired_or_consumed";
    if (code.includes("invalid_grant") || message.includes("invalid grant")) return "invalid_grant";
    if (typeof candidate?.status === "number") return `http_${candidate.status}`;
    return "unknown";
}
