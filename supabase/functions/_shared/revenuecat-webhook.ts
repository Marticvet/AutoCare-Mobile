const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RevenueCatWebhookEvent = {
    id?: string;
    type?: string;
    app_user_id?: string;
    original_app_user_id?: string;
    aliases?: string[];
    transferred_from?: string[];
    transferred_to?: string[];
};

export class RevenueCatWebhookAuthenticationError extends Error {}
export class RevenueCatWebhookConfigurationError extends Error {}

export function revenueCatEventUserIds(event: RevenueCatWebhookEvent) {
    const candidates = event.type === "TRANSFER"
        ? [...(event.transferred_from ?? []), ...(event.transferred_to ?? [])]
        : [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
    return [...new Set(candidates.filter((value): value is string => typeof value === "string" && UUID_PATTERN.test(value)))];
}

export function constantTimeEqual(left: string, right: string) {
    const leftBytes = new TextEncoder().encode(left);
    const rightBytes = new TextEncoder().encode(right);
    if (leftBytes.length !== rightBytes.length) return false;
    let difference = 0;
    for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
    return difference === 0;
}

function signatureParts(header: string) {
    const values = Object.fromEntries(header.split(",").map((part) => {
        const separator = part.indexOf("=");
        return separator > 0
            ? [part.slice(0, separator).trim(), part.slice(separator + 1).trim()]
            : ["", ""];
    }));
    const timestamp = values.t;
    const signature = values.v1;
    if (!timestamp || !signature || !/^\d+$/.test(timestamp)) {
        throw new RevenueCatWebhookAuthenticationError("Invalid webhook signature header.");
    }
    return { timestamp, signature };
}

export async function verifyRevenueCatWebhook({
    authorization,
    expectedAuthorization,
    signatureHeader,
    signingSecret,
    rawBody,
    nowSeconds = Date.now() / 1_000,
    hmacSha256,
}: {
    authorization: string;
    expectedAuthorization?: string;
    signatureHeader: string;
    signingSecret?: string;
    rawBody: string;
    nowSeconds?: number;
    hmacSha256?: (message: string, secret: string) => Promise<string>;
}) {
    if (!expectedAuthorization) {
        throw new RevenueCatWebhookConfigurationError("Webhook authorization is not configured.");
    }
    if (!constantTimeEqual(authorization, expectedAuthorization)) {
        throw new RevenueCatWebhookAuthenticationError("Invalid webhook authorization.");
    }

    // Keep HMAC opt-in so that an Authorization-only integration remains
    // compatible when no signing secret is configured. When a signing secret
    // is configured in both RevenueCat and Supabase, every delivery must also
    // pass the signature and timestamp checks below. Event-ID persistence makes
    // successful deliveries replay-safe; subscriber re-fetching prevents a
    // payload from granting arbitrary access.
    if (!signingSecret) return;
    if (!hmacSha256) {
        throw new RevenueCatWebhookConfigurationError("Webhook HMAC verifier is not configured.");
    }
    const { timestamp, signature } = signatureParts(signatureHeader);
    if (Math.abs(nowSeconds - Number(timestamp)) > 300) {
        throw new RevenueCatWebhookAuthenticationError("Webhook signature timestamp is outside the allowed window.");
    }
    const expected = await hmacSha256(`${timestamp}.${rawBody}`, signingSecret);
    if (!constantTimeEqual(signature, expected)) {
        throw new RevenueCatWebhookAuthenticationError("Invalid webhook signature.");
    }
}
