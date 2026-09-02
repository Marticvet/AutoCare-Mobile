import * as Location from "expo-location";

export type CapturedLocation = {
    latitude: number;
    longitude: number;
    label: string;
};

export async function resolveLocationLabel(latitude: number, longitude: number) {
    const fallback = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (!address) return fallback;
        const streetAddress = address.street
            ? [address.street, address.streetNumber].filter(Boolean).join(" ")
            : address.name;
        return [streetAddress, address.postalCode, address.city, address.region, address.country]
            .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
            .join(", ") || fallback;
    } catch {
        return fallback;
    }
}

export async function captureCurrentLocation(): Promise<CapturedLocation> {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
        throw new Error("Location permission was not granted.");
    }
    const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = position.coords;
    const label = await resolveLocationLabel(latitude, longitude);
    return { latitude, longitude, label };
}
