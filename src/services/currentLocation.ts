import * as Location from "expo-location";

export type CapturedLocation = {
    latitude: number;
    longitude: number;
    label: string;
};

export type DeviceCoordinates = Pick<CapturedLocation, "latitude" | "longitude">;

export type LocationPermissionMessages = {
    disabled: string;
    denied: string;
};

async function requireForegroundLocationPermission(messages: LocationPermissionMessages) {
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status === "granted") return;
    if (!permission.canAskAgain) {
        throw new Error(messages.disabled);
    }
    permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
        throw new Error(messages.denied);
    }
}

export async function captureDeviceCoordinates({
    allowRecentLocation = false,
    permissionMessages,
}: {
    allowRecentLocation?: boolean;
    permissionMessages: LocationPermissionMessages;
}): Promise<DeviceCoordinates> {
    await requireForegroundLocationPermission(permissionMessages);

    if (allowRecentLocation) {
        const recent = await Location.getLastKnownPositionAsync({
            maxAge: 5 * 60 * 1000,
            requiredAccuracy: 500,
        });
        if (recent) {
            return {
                latitude: recent.coords.latitude,
                longitude: recent.coords.longitude,
            };
        }
    }

    const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
    });
    return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
    };
}

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

export async function captureCurrentLocation(permissionMessages: LocationPermissionMessages): Promise<CapturedLocation> {
    const { latitude, longitude } = await captureDeviceCoordinates({ permissionMessages });
    const label = await resolveLocationLabel(latitude, longitude);
    return { latitude, longitude, label };
}
