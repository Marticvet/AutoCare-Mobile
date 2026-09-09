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

export type GooglePlacesErrorMessages = {
    unavailable: string;
    sessionExpired: string;
    notDeployed: string;
    busy: string;
    notConfigured: string;
};

async function callPlaces<T>(action: PlacesAction, body: Record<string, unknown>, messages: GooglePlacesErrorMessages): Promise<T> {
    const { data, error, response } = await system.supabaseConnector.client.functions.invoke("google-places", {
        body: { action, ...body },
    });
    if (error) {
        throw new Error(await edgeFunctionErrorMessage(
            error,
            response,
            messages.unavailable,
            {
                401: messages.sessionExpired,
                404: messages.notDeployed,
                429: messages.busy,
                503: messages.notConfigured,
            }
        ));
    }
    if (data?.error) throw new Error(data.error);
    return data as T;
}

export async function autocompletePlaces(input: string, origin: PlaceOrigin | null | undefined, messages: GooglePlacesErrorMessages) {
    const data = await callPlaces<{ suggestions: PlaceSuggestion[] }>("autocomplete", {
        input,
        origin: origin ?? undefined,
    }, messages);
    return data.suggestions;
}

export async function searchClosestPlace(query: string, origin: PlaceOrigin | null | undefined, messages: GooglePlacesErrorMessages) {
    const data = await callPlaces<{ places: PlaceLocation[] }>("searchText", {
        query,
        origin: origin ?? undefined,
    }, messages);
    return data.places[0] ?? null;
}

export async function getPlaceDetails(placeId: string, messages: GooglePlacesErrorMessages): Promise<PlaceLocation> {
    return callPlaces<PlaceLocation>("details", { placeId }, messages);
}

export async function searchNearbyPlaces(type: "gas_station" | "car_repair", origin: PlaceOrigin, messages: GooglePlacesErrorMessages) {
    const data = await callPlaces<{ places: NearbyPlace[] }>("nearby", { type, origin }, messages);
    return data.places;
}
