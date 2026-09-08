import { system } from "../powersync/PowerSync";
import { edgeFunctionErrorMessage } from "./edgeFunctionError";

export type PlaceOrigin = {
    latitude: number;
    longitude: number;
};

export type PlaceSuggestion = {
    placeId: string;
    description: string;
};

export type PlaceLocation = PlaceOrigin & {
    placeId: string;
    label: string;
};

export type NearbyPlace = PlaceLocation & {
    name: string;
    address: string;
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    openNow?: boolean;
};

type PlacesAction = "autocomplete" | "details" | "searchText" | "nearby";

async function callPlaces<T>(action: PlacesAction, body: Record<string, unknown>): Promise<T> {
    const { data, error, response } = await system.supabaseConnector.client.functions.invoke("google-places", {
        body: { action, ...body },
    });
    if (error) {
        throw new Error(await edgeFunctionErrorMessage(
            error,
            response,
            "Google Places search is temporarily unavailable.",
            {
                404: "Google Places search has not been deployed yet.",
                429: "Google Places search is temporarily busy. Please try again shortly.",
                503: "Google Places search is not configured yet.",
            }
        ));
    }
    if (data?.error) throw new Error(data.error);
    return data as T;
}

export async function autocompletePlaces(input: string, origin?: PlaceOrigin | null) {
    const data = await callPlaces<{ suggestions: PlaceSuggestion[] }>("autocomplete", {
        input,
        origin: origin ?? undefined,
    });
    return data.suggestions;
}

export async function searchClosestPlace(query: string, origin?: PlaceOrigin | null) {
    const data = await callPlaces<{ places: PlaceLocation[] }>("searchText", {
        query,
        origin: origin ?? undefined,
    });
    return data.places[0] ?? null;
}

export async function getPlaceDetails(placeId: string): Promise<PlaceLocation> {
    return callPlaces<PlaceLocation>("details", { placeId });
}

export async function searchNearbyPlaces(type: "gas_station" | "car_repair", origin: PlaceOrigin) {
    const data = await callPlaces<{ places: NearbyPlace[] }>("nearby", { type, origin });
    return data.places;
}
