export type SchedulerEnv = {
    ACCOUNT_DELETION_RETRY_SECRET: string;
    SUPABASE_RETRY_FUNCTION_URL: string;
};

type RetryWorkerResponse = Pick<Response, "ok" | "status" | "json">;
type RetryWorkerFetch = (input: string, init: RequestInit) => Promise<RetryWorkerResponse>;

type RetryWorkerPayload = {
    processed?: unknown;
    health?: {
        needsAttention?: unknown;
    };
};

export const RETRY_TIMEOUT_MS = 20_000;

function isHealthyPayload(payload: unknown): payload is Required<Pick<RetryWorkerPayload, "processed" | "health">> {
    if (!payload || typeof payload !== "object") return false;
    const candidate = payload as RetryWorkerPayload;
    return typeof candidate.processed === "number"
        && !!candidate.health
        && candidate.health.needsAttention === false;
}

/**
 * Invoke the already-deployed, server-authorized retry worker exactly once.
 * Queue locking and retries remain exclusively in Supabase.
 */
export async function invokeDeletionRetryWorker(
    env: SchedulerEnv,
    request: RetryWorkerFetch = fetch,
    timeoutMs = RETRY_TIMEOUT_MS
) {
    if (!env.ACCOUNT_DELETION_RETRY_SECRET || !env.SUPABASE_RETRY_FUNCTION_URL) {
        throw new Error("Deletion retry scheduler is not configured.");
    }

    const timeout = new AbortController();
    const timeoutId = setTimeout(() => timeout.abort(), timeoutMs);
    let response: RetryWorkerResponse;
    try {
        response = await request(env.SUPABASE_RETRY_FUNCTION_URL, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-cron-secret": env.ACCOUNT_DELETION_RETRY_SECRET,
            },
            signal: timeout.signal,
        });
    } catch {
        console.error("RevenueCat deletion retry request failed.");
        throw new Error("RevenueCat deletion retry request failed.");
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        console.error("RevenueCat deletion retry returned an error status.", { status: response.status });
        throw new Error("RevenueCat deletion retry returned an error status.");
    }

    let payload: unknown;
    try {
        payload = await response.json();
    } catch {
        console.error("RevenueCat deletion retry returned an invalid response.");
        throw new Error("RevenueCat deletion retry returned an invalid response.");
    }
    if (!isHealthyPayload(payload)) {
        console.error("RevenueCat deletion retry reported an unhealthy queue.");
        throw new Error("RevenueCat deletion retry reported an unhealthy queue.");
    }

    console.log("RevenueCat deletion retry completed successfully.");
}

type ScheduledController = { cron: string; scheduledTime: number };
type ScheduledContext = { waitUntil(promise: Promise<unknown>): void };

const worker = {
    async scheduled(_controller: ScheduledController, env: SchedulerEnv, ctx: ScheduledContext) {
        // A rejected waitUntil marks the scheduled invocation as failed for
        // Cloudflare Logs/Issues and any configured notification rule.
        ctx.waitUntil(invokeDeletionRetryWorker(env));
    },
    fetch() {
        // This Worker has no public control plane; Cron is its only trigger.
        return new Response(null, { status: 404 });
    },
};

export default worker;
