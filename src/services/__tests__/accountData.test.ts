jest.mock("expo-file-system/legacy", () => ({}));
jest.mock("expo-sharing", () => ({}));
jest.mock("../../powersync/PowerSync", () => ({
    system: {
        supabaseConnector: {
            client: { functions: { invoke: jest.fn() } },
        },
    },
}));

// Mocks must be registered before importing the service.
// eslint-disable-next-line import/first
import { accountDeletionRequestError } from "../accountData";

const response = (status: number, payload: unknown) => ({
    status,
    clone() { return this; },
    async json() { return payload; },
    async text() { return ""; },
});

describe("account deletion Edge Function failures", () => {
    it("surfaces only the safe server error, status, and code", async () => {
        const context = response(409, {
            error: "We could not confirm the account deletion state. Sign in again only if the account is still available.",
            code: "ACCOUNT_DELETION_STATE_UNKNOWN",
        });
        await expect(accountDeletionRequestError(
            { message: "Edge Function returned a non-2xx status code", context }
        )).resolves.toMatchObject({
            name: "AccountDeletionRequestError",
            message: expect.stringContaining("HTTP 409 · ACCOUNT_DELETION_STATE_UNKNOWN"),
            status: 409,
            code: "ACCOUNT_DELETION_STATE_UNKNOWN",
            authDeletionMayHaveOccurred: true,
            shouldClearLocalSession: true,
        });
    });

    it("classifies a confirmed pre-Auth failure as safe to retry", async () => {
        const context = response(500, {
            error: "Account deletion could not be completed. No account deletion was confirmed.",
            code: "ACCOUNT_DELETION_FAILED",
        });
        await expect(accountDeletionRequestError({ context })).resolves.toMatchObject({
            code: "ACCOUNT_DELETION_FAILED",
            authDeletionMayHaveOccurred: false,
            shouldClearLocalSession: false,
        });
    });

    it("clears a stale local session when the function rejects its access token", async () => {
        const context = response(401, { error: "Invalid session", code: "INVALID_SESSION" });

        await expect(accountDeletionRequestError({ context })).resolves.toMatchObject({
            code: "INVALID_SESSION",
            authDeletionMayHaveOccurred: false,
            shouldClearLocalSession: true,
        });
    });
});
