import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    TextInput,
    FlatList,
    Keyboard,
} from "react-native";
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {
    getCurrentPositionAsync,
    useForegroundPermissions,
} from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { getAddress, GOOGLE_API_KEY } from "../utils/location";

export default function MapScreen({ route }: any) {
    const { setPlace, setLocationName } = route.params;

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [pickedLocation, setPickedLocation] = useState<string | null>(null);

    const [locationPermissionInformation, requestPermission] =
        useForegroundPermissions();

    const mapRef = useRef<MapView>(null);
    const isFocused = useIsFocused();

    useEffect(() => {
        getLocationHandler();
    }, []);

    useEffect(() => {
        const delay = setTimeout(() => {
            if (query.length > 2) {
                setSuggestions([]);
                fetchAddressSuggestions(query);
            } else {
                setSuggestions([]);
            }
        }, 100);

        return () => clearTimeout(delay);
    }, [query]);

    async function verifyPermissions() {
        if (locationPermissionInformation?.status === "granted") return true;

        const permissionResponse = await requestPermission();
        if (!permissionResponse.granted) {
            Alert.alert(
                "Insufficient Permissions!",
                "You need to grant location permissions."
            );
            return false;
        }
        return true;
    }

    async function getLocationHandler() {
        const hasPermission = await verifyPermissions();
        if (!hasPermission) return;

        try {
            const location = await getCurrentPositionAsync();
            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            setSelectedLocation(coords);
            setPlace(coords);

            await handleLocation(coords.latitude, coords.longitude);

            mapRef.current?.animateToRegion({
                ...coords,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            });
        } catch (error) {
            Alert.alert("Error", "Failed to fetch current location");
            console.warn(error);
        }
    }

    async function handleLocation(lat: number, lng: number) {
        try {
            const address = await getAddress(lat, lng);
            setPickedLocation(address);
            setLocationName(address);
        } catch (error) {
            setPickedLocation(null);
            setLocationName("");
        }
    }

    const fetchAddressSuggestions = async (input: string) => {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            input
        )}&key=${GOOGLE_API_KEY}&types=geocode&language=en`;

        setLocationName("");

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === "OK") {
                setSuggestions(data.predictions);
                setLocationName(data.predictions[0]?.description || "");
            } else {
                console.warn("Google Places API error:", data.status);
                setSuggestions([]);
            }
        } catch (error) {
            console.warn("Error fetching suggestions:", error);
        }
    };

    const handleSuggestionPress = async (
        placeId: string,
        description: string
    ) => {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`;

        try {
            const response = await fetch(detailsUrl);
            const data = await response.json();

            if (data.status === "OK") {
                const location = data.result.geometry.location;
                const coords = {
                    latitude: location.lat,
                    longitude: location.lng,
                };

                setSelectedLocation(coords);
                setPlace(coords);
                setPickedLocation(description);
                setLocationName(description);
                setSuggestions([]);
                setQuery(description);

                mapRef.current?.animateToRegion({
                    ...coords,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                });

                Keyboard.dismiss();
            } else {
                console.warn("Place details error:", data.status);
            }
        } catch (error) {
            console.warn("Error fetching place details:", error);
        }
    };

    function selectLocationHandler(event: any) {
        const lat = event.nativeEvent.coordinate.latitude;
        const lng = event.nativeEvent.coordinate.longitude;

        const coords = { latitude: lat, longitude: lng };
        setSelectedLocation(coords);
        setPlace(coords);

        setSuggestions([]);
        setQuery("");
        setPickedLocation(null);
        setLocationName("");
        Keyboard.dismiss();

        mapRef.current?.animateToRegion({
            ...coords,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
        });

        handleLocation(lat, lng);
    }

    return (
        <View style={styles.container}>
            {/* Floating Address Input */}
            <View style={styles.searchContainer}>
                <View style={styles.inputWrapper}>
                    <TextInput
                        placeholder="Enter address"
                        value={query}
                        onChangeText={(text) => {
                            setQuery(text);
                            setSuggestions([]);
                        }}
                        style={styles.searchInput}
                        clearButtonMode={"while-editing"}
                    />
                </View>

                {suggestions.length > 0 && (
                    <FlatList
                        data={suggestions}
                        keyExtractor={(item) => item.place_id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.suggestionItem}
                                onPress={() => {
                                    setSuggestions([]);
                                    handleSuggestionPress(
                                        item.place_id,
                                        item.description
                                    );
                                }}
                            >
                                <Text>{item.description}</Text>
                            </TouchableOpacity>
                        )}
                        style={styles.suggestionList}
                        keyboardShouldPersistTaps="handled"
                    />
                )}
            </View>

            {/* Map */}
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: 51.13,
                    longitude: 8.89,
                    latitudeDelta: 2.5,
                    longitudeDelta: 2.5,
                }}
                onPress={selectLocationHandler}
                showsUserLocation={true}
            >
                {/* ✅ Safe Marker Render*/}
                {selectedLocation && (
                    <Marker
                        draggable
                        coordinate={selectedLocation}
                        title={pickedLocation || "Selected Location"}
                        onDragEnd={selectLocationHandler}
                    />
                )}
            </MapView>

            {/* Locate Button */}
            <TouchableOpacity
                style={styles.locateButton}
                onPress={getLocationHandler}
            >
                <Ionicons name="locate" size={28} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1, zIndex: 1 },
    locateButton: {
        position: "absolute",
        bottom: 30,
        right: 20,
        backgroundColor: "#007AFF",
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        zIndex: 3,
    },
    searchContainer: {
        position: "absolute",
        top: 10,
        left: 55,
        right: 55,
        zIndex: 10,
        opacity: 0.9,
    },
    inputWrapper: {
        backgroundColor: "white",
        borderRadius: 8,
        borderColor: "#ccc",
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 16,
    },
    suggestionList: {
        backgroundColor: "white",
        borderRadius: 8,
        marginTop: 4,
        maxHeight: 150,
        borderWidth: 1,
        borderColor: "#ccc",
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderColor: "#eee",
    },
});
