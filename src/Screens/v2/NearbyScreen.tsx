import * as Location from "expo-location";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Card, ChoiceChips, EmptyState, LoadingState, Row, Screen, SectionHeader } from "../../components/ui";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { useConnectivity } from "../../providers/ConnectivityProvider";
import { colors, spacing } from "../../theme/tokens";

type PlaceType = "gas_station" | "car_repair";
type PlaceResult = {
    place_id: string;
    name: string;
    vicinity?: string;
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    opening_hours?: { open_now?: boolean };
};

const GOOGLE_KEY =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ||
    "";

export default function NearbyScreen() {
    const { t } = usePreferences();
    const { isOnline } = useConnectivity();
    const [type, setType] = useState<PlaceType>("gas_station");
    const [places, setPlaces] = useState<PlaceResult[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchNearby = useCallback(async () => {
        if (!isOnline || !GOOGLE_KEY) return;
        setLoading(true);
        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status !== "granted") {
                Alert.alert(t("nearby"), t("locationPermission"));
                return;
            }
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.coords.latitude},${location.coords.longitude}&radius=8000&type=${type}&key=${GOOGLE_KEY}`;
            const response = await fetch(url);
            const payload = await response.json();
            if (!response.ok || !["OK", "ZERO_RESULTS"].includes(payload.status)) throw new Error(payload.error_message || payload.status || "Nearby search failed");
            setPlaces(payload.results ?? []);
        } catch (error) {
            Alert.alert(t("nearby"), (error as Error).message);
        } finally {
            setLoading(false);
        }
    }, [isOnline, t, type]);

    useEffect(() => { void fetchNearby(); }, [fetchNearby]);

    if (!isOnline) return <Screen contentStyle={styles.center}><EmptyState icon="cloud-offline-outline" title={t("offline")} body={t("nearbyOffline")} /></Screen>;
    if (!GOOGLE_KEY) return <Screen contentStyle={styles.center}><EmptyState icon="key-outline" title={t("nearby")} body={t("mapsKeyMissing")} /></Screen>;
    return (
        <Screen>
            <SectionHeader title={t("nearby")} />
            <ChoiceChips<PlaceType> value={type} onChange={setType} options={[{ value: "gas_station", label: t("nearbyFuel"), icon: "water-outline" }, { value: "car_repair", label: t("nearbyService"), icon: "construct-outline" }]} />
            <Button label={t("retry")} icon="locate-outline" variant="secondary" onPress={() => void fetchNearby()} />
            {loading ? <LoadingState /> : places.length ? (
                <Card style={styles.list}>
                    {places.map((place, index) => (
                        <View key={place.place_id}>
                            <Row
                                icon={type === "gas_station" ? "water-outline" : "construct-outline"}
                                title={place.name}
                                subtitle={`${place.vicinity ?? ""}${place.rating ? ` · ★ ${place.rating} (${place.user_ratings_total ?? 0})` : ""}${place.price_level ? ` · ${"€".repeat(place.price_level)}` : ""}`}
                                tone={place.opening_hours?.open_now === false ? "red" : "green"}
                                onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query_place_id=${place.place_id}&query=${encodeURIComponent(place.name)}`)}
                            />
                            {index < places.length - 1 ? <View style={styles.divider} /> : null}
                        </View>
                    ))}
                </Card>
            ) : <EmptyState icon="location-outline" title={t("none")} body={t("nearby")} />}
        </Screen>
    );
}

const styles = StyleSheet.create({
    center: { justifyContent: "center" },
    list: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
});
