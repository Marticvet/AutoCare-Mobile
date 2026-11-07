import worker, { invokeDeletionRetryWorker } from "../index";

const env = {
    ACCOUNT_DELETION_RETRY_SECRET: "scheduler-secret",
    SUPABASE_RETRY_FUNCTION_URL: "https://example.invalid/functions/v1/process-revenuecat-deletion-retries",
};

const response = (status: number, payload: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(payload),
});

describe("RevenueCat deletion retry scheduler", () => {
    it("posts once with the server-side secret and accepts a healthy queue", async () => {
        const request = jest.fn().mockResolvedValue(response(200, {
            processed: 0,
            health: { needsAttention: false },
        }));

        await invokeDeletionRetryWorker(env, request);

        expect(request).toHaveBeenCalledTimes(1);
        expect(request).toHaveBeenCalledWith(env.SUPABASE_RETRY_FUNCTION_URL, expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
                "x-cron-secret": env.ACCOUNT_DELETION_RETRY_SECRET,
            }),
        }));
    });

    it("fails visibly for an HTTP error or unhealthy payload", async () => {
        const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
        await expect(invokeDeletionRetryWorker(env, jest.fn().mockResolvedValue(response(503, {}))))
            .rejects.toThrow("error status");
        await expect(invokeDeletionRetryWorker(env, jest.fn().mockResolvedValue(response(200, {
            processed: 1,
            health: { needsAttention: true },
        })))).rejects.toThrow("unhealthy queue");
        error.mockRestore();
    });

    it("fails visibly for a network error and does not expose its detail", async () => {
        const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
        await expect(invokeDeletionRetryWorker(env, jest.fn().mockRejectedValue(new Error("network failure"))))
            .rejects.toThrow("request failed");
        expect(error).toHaveBeenCalledWith("RevenueCat deletion retry request failed.");
        error.mockRestore();
    });

    it("runs the invocation through the scheduled event context", async () => {
        const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(response(200, {
            processed: 0,
            health: { needsAttention: false },
        }) as unknown as Response);
        let scheduledWork: Promise<unknown> | undefined;
        const waitUntil = jest.fn((promise: Promise<unknown>) => {
            scheduledWork = promise;
        });
        await worker.scheduled({ cron: "*/5 * * * *", scheduledTime: Date.now() }, env, { waitUntil });
        expect(waitUntil).toHaveBeenCalledTimes(1);
        await expect(scheduledWork).resolves.toBeUndefined();
        fetchSpy.mockRestore();
    });
});
