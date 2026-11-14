import * as Location from "expo-location";
import { captureDeviceCoordinates, resolveLocationLabel } from "../currentLocation";

jest.mock("expo-location", () => ({
    Accuracy: { Balanced: 3 },
    hasServicesEnabledAsync: jest.fn(),
    getForegroundPermissionsAsync: jest.fn(),
    requestForegroundPermissionsAsync: jest.fn(),
    getLastKnownPositionAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
    reverseGeocodeAsync: jest.fn(),
}));

const location = Location as jest.Mocked<typeof Location>;
const messages = { disabled: "Location unavailable", denied: "Permission denied" };

describe("current location permission flow", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        location.hasServicesEnabledAsync.mockResolvedValue(true);
        location.getCurrentPositionAsync.mockResolvedValue({
            coords: { latitude: 52.52, longitude: 13.405 },
        } as Location.LocationObject);
    });

    it("uses an existing grant without asking again", async () => {
        location.getForegroundPermissionsAsync.mockResolvedValue({ status: "granted", canAskAgain: true } as Location.LocationPermissionResponse);

        await expect(captureDeviceCoordinates({ permissionMessages: messages })).resolves.toEqual({ latitude: 52.52, longitude: 13.405 });
        expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it("requests permission only when it can still be requested", async () => {
        location.getForegroundPermissionsAsync.mockResolvedValue({ status: "undetermined", canAskAgain: true } as Location.LocationPermissionResponse);
        location.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted", canAskAgain: true } as Location.LocationPermissionResponse);

        await expect(captureDeviceCoordinates({ permissionMessages: messages })).resolves.toEqual({ latitude: 52.52, longitude: 13.405 });
        expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it("does not prompt after a final denial", async () => {
        location.getForegroundPermissionsAsync.mockResolvedValue({ status: "denied", canAskAgain: false } as Location.LocationPermissionResponse);

        await expect(captureDeviceCoordinates({ permissionMessages: messages })).rejects.toThrow(messages.disabled);
        expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it("reports disabled location services before requesting permission", async () => {
        location.hasServicesEnabledAsync.mockResolvedValue(false);

        await expect(captureDeviceCoordinates({ permissionMessages: messages })).rejects.toThrow(messages.disabled);
        expect(location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it("falls back to coordinates when reverse geocoding is unavailable", async () => {
        location.reverseGeocodeAsync.mockRejectedValue(new Error("offline"));
        await expect(resolveLocationLabel(52.52, 13.405)).resolves.toBe("52.52000, 13.40500");
    });
});
