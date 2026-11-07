type ResponseLike = {
    status?: number;
    clone?: () => ResponseLike;
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
};

export type EdgeFunctionErrorDetails = {
    status?: number;
    code?: string;
    message?: string;
};

const responseFrom = (error: unknown, response?: ResponseLike) => {
    if (response) return response;
    if (typeof error !== "object" || error === null) return undefined;
    return (error as { context?: ResponseLike }).context;
};

const detailsFromPayload = (payload: unknown): Pick<EdgeFunctionErrorDetails, "code" | "message"> => {
    if (typeof payload === "string" && payload.trim()) return { message: payload.trim() };
    if (typeof payload !== "object" || payload === null) return {};
    const candidate = payload as { error?: unknown; message?: unknown; code?: unknown };
    return {
        code: typeof candidate.code === "string" && candidate.code.trim() ? candidate.code.trim() : undefined,
        message: typeof candidate.error === "string" && candidate.error.trim()
            ? candidate.error.trim()
            : typeof candidate.message === "string" && candidate.message.trim()
                ? candidate.message.trim()
                : undefined,
    };
};

export async function edgeFunctionErrorDetails(error: unknown, response?: ResponseLike): Promise<EdgeFunctionErrorDetails> {
    const functionResponse = responseFrom(error, response);
    if (!functionResponse) return {};
    const jsonResponse = functionResponse.clone?.() ?? functionResponse;
    if (typeof jsonResponse.json === "function") {
        try {
            const details = detailsFromPayload(await jsonResponse.json());
            if (details.code || details.message) return { status: functionResponse.status, ...details };
        } catch {
            // Some gateways return plain text even when a JSON body is expected.
        }
    }
    const textResponse = functionResponse.clone?.() ?? functionResponse;
    if (typeof textResponse.text === "function") {
        try {
            return { status: functionResponse.status, ...detailsFromPayload(await textResponse.text()) };
        } catch {
            return { status: functionResponse.status };
        }
    }
    return { status: functionResponse.status };
}

export async function edgeFunctionErrorMessage(
    error: unknown,
    response?: ResponseLike,
    fallback = "The server request failed.",
    statusMessages: Partial<Record<number, string>> = {}
) {
    const details = await edgeFunctionErrorDetails(error, response);
    if (details.message) return details.message;

    const status = details.status;
    if (status !== undefined && statusMessages[status]) return statusMessages[status];

    switch (status) {
        case 401:
            return "Your session has expired. Sign in again and retry.";
        case 404:
            return "Receipt scanning is not available on the server yet.";
        case 413:
            return "The receipt photo is too large. Move closer and take another photo.";
        case 429:
            return "Receipt scanning is temporarily busy. Please try again shortly.";
        default:
            break;
    }

    if (typeof error === "object" && error !== null) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string" && message.trim() && !message.includes("non-2xx status code")) {
            return message.trim();
        }
    }
    return fallback;
}
