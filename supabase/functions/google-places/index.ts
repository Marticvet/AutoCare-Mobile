import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Origin = { latitude: number; longitude: number };

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
        const authorization = request.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

        const url = Deno.env.get("SUPABASE_URL");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        const mapsKey = Deno.env.get("GOOGLE_MAPS_SERVER_API_KEY");
        if (!url || !anonKey) throw new Error("Supabase function configuration is missing.");
        if (!mapsKey) return json({
            error: "Google Places is not configured. Add GOOGLE_MAPS_SERVER_API_KEY to the Supabase function secrets.",
            code: "places_not_configured",
        }, 503);

        const userClient = createClient(url, anonKey, {
            global: { headers: { Authorization: authorization } },
            auth: { persistSession: false },
        });
        const { data: { user }, error: authError } = await userClient.auth.getUser();
        if (authError || !user) return json({ error: "Invalid session" }, 401);

        const body = await request.json() as Record<string, unknown>;
        switch (body.action) {
            case "autocomplete":
                return json(await autocomplete(mapsKey, body));
            case "searchText":
                return json(await searchText(mapsKey, body));
            case "details":
                return json(await details(mapsKey, body));
            case "nearby":
                return json(await nearby(mapsKey, body));
            default:
                return json({ error: "Unsupported Google Places operation" }, 400);
        }
    } catch (error) {
        console.error("google-places failed", error);
        return json({ error: error instanceof Error ? error.message : "Google Places request failed" }, 500);
    }
});

async function autocomplete(apiKey: string, body: Record<string, unknown>) {
    const input = requiredText(body.input, "Search text", 120);
    const origin = optionalOrigin(body.origin);
    const payload: Record<string, unknown> = { input, includeQueryPredictions: false };
    if (origin) payload.locationBias = circle(origin, 50_000);

    const response = await googleRequest("https://places.googleapis.com/v1/places:autocomplete", apiKey, {
        method: "POST",
        body: payload,
        fieldMask: "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
    });
    const suggestions = (Array.isArray(response.suggestions) ? response.suggestions : [])
        .map((entry: any) => entry?.placePrediction)
        .filter((entry: any) => entry?.placeId && entry?.text?.text)
        .map((entry: any) => ({ placeId: entry.placeId, description: entry.text.text }));
    return { suggestions };
}

async function searchText(apiKey: string, body: Record<string, unknown>) {
    const query = requiredText(body.query, "Search text", 120);
    const origin = optionalOrigin(body.origin);
    const payload: Record<string, unknown> = { textQuery: query, maxResultCount: 10 };
    if (origin) {
        payload.locationBias = circle(origin, 50_000);
        payload.rankPreference = "DISTANCE";
    }
    const response = await googleRequest("https://places.googleapis.com/v1/places:searchText", apiKey, {
        method: "POST",
        body: payload,
        fieldMask: "places.id,places.displayName,places.formattedAddress,places.location",
    });
    return { places: normalizePlaces(response.places) };
}

async function details(apiKey: string, body: Record<string, unknown>) {
    const placeId = requiredText(body.placeId, "Place ID", 256);
    const response = await googleRequest(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
        apiKey,
        { method: "GET", fieldMask: "id,displayName,formattedAddress,location" }
    );
    const place = normalizePlace(response);
    if (!place) throw new Error("The selected place does not include a map location.");
    return place;
}

async function nearby(apiKey: string, body: Record<string, unknown>) {
    const origin = requiredOrigin(body.origin);
    const type = body.type === "gas_station" || body.type === "car_repair" ? body.type : null;
    if (!type) throw new Error("Unsupported nearby place type.");
    const response = await googleRequest("https://places.googleapis.com/v1/places:searchNearby", apiKey, {
        method: "POST",
        body: {
            includedTypes: [type],
            maxResultCount: 20,
            rankPreference: "DISTANCE",
            locationRestriction: { circle: { center: origin, radius: 8_000 } },
        },
        fieldMask: "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours.openNow",
    });
    return { places: normalizePlaces(response.places, true) };
}

async function googleRequest(
    url: string,
    apiKey: string,
    options: { method: "GET" | "POST"; body?: unknown; fieldMask: string }
) {
    const response = await fetch(url, {
        method: options.method,
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": options.fieldMask,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload?.error?.message || "Google Places rejected the request.");
    }
    return payload;
}

function normalizePlaces(value: unknown, includeMetadata = false) {
    if (!Array.isArray(value)) return [];
    return value.map((place) => normalizePlace(place, includeMetadata)).filter(Boolean);
}

function normalizePlace(place: any, includeMetadata = false) {
    const latitude = Number(place?.location?.latitude);
    const longitude = Number(place?.location?.longitude);
    if (!place?.id || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    const name = typeof place?.displayName?.text === "string" ? place.displayName.text : "";
    const address = typeof place?.formattedAddress === "string" ? place.formattedAddress : "";
    const label = name && address && !address.toLocaleLowerCase().includes(name.toLocaleLowerCase())
        ? `${name}, ${address}`
        : address || name;
    const normalized: Record<string, unknown> = { placeId: place.id, label, latitude, longitude };
    if (includeMetadata) {
        normalized.name = name || address;
        normalized.address = address;
        if (typeof place.rating === "number") normalized.rating = place.rating;
        if (typeof place.userRatingCount === "number") normalized.userRatingCount = place.userRatingCount;
        if (typeof place.priceLevel === "string") normalized.priceLevel = place.priceLevel;
        if (typeof place.currentOpeningHours?.openNow === "boolean") normalized.openNow = place.currentOpeningHours.openNow;
    }
    return normalized;
}

function circle(origin: Origin, radius: number) {
    return { circle: { center: origin, radius } };
}

function optionalOrigin(value: unknown): Origin | null {
    if (typeof value !== "object" || value === null) return null;
    const latitude = Number((value as Origin).latitude);
    const longitude = Number((value as Origin).longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
}

function requiredOrigin(value: unknown) {
    const origin = optionalOrigin(value);
    if (!origin) throw new Error("A valid device location is required.");
    return origin;
}

function requiredText(value: unknown, label: string, maxLength: number) {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
    return value.trim().slice(0, maxLength);
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
