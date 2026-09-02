type ResponseLike = {
    status?: number;
    clone?: () => ResponseLike;
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
};

const responseFrom = (error: unknown, response?: ResponseLike) => {
    if (response) return response;
    if (typeof error !== "object" || error === null) return undefined;
    return (error as { context?: ResponseLike }).context;
};

const messageFromPayload = (payload: unknown) => {
    if (typeof payload === "string" && payload.trim()) return payload.trim();
    if (typeof payload !== "object" || payload === null) return undefined;
    const candidate = payload as { error?: unknown; message?: unknown };
    if (typeof candidate.error === "string" && candidate.error.trim()) return candidate.error.trim();
    if (typeof candidate.message === "string" && candidate.message.trim()) return candidate.message.trim();
    return undefined;
};

async function responseMessage(response?: ResponseLike) {
    if (!response) return undefined;
    const jsonResponse = response.clone?.() ?? response;
    if (typeof jsonResponse.json === "function") {
        try {
            const message = messageFromPayload(await jsonResponse.json());
            if (message) return message;
        } catch {
            // Some gateways return plain text even when a JSON body is expected.
        }
    }
    const textResponse = response.clone?.() ?? response;
    if (typeof textResponse.text === "function") {
        try {
            return messageFromPayload(await textResponse.text());
        } catch {
            return undefined;
        }
    }
    return undefined;
}

export async function edgeFunctionErrorMessage(
    error: unknown,
    response?: ResponseLike,
    fallback = "The server request failed."
) {
    const functionResponse = responseFrom(error, response);
    const serverMessage = await responseMessage(functionResponse);
    if (serverMessage) return serverMessage;

    switch (functionResponse?.status) {
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
