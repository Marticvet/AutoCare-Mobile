import * as Linking from "expo-linking";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Card, ChoiceChips, EmptyState, LoadingState, Row, Screen, SectionHeader } from "../../components/ui";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { useConnectivity } from "../../providers/ConnectivityProvider";
import { captureDeviceCoordinates } from "../../services/currentLocation";
import { NearbyPlace, searchNearbyPlaces } from "../../services/googlePlaces";
import { colors, spacing } from "../../theme/tokens";

type PlaceType = "gas_station" | "car_repair";

export default function NearbyScreen() {
    const { t } = usePreferences();
    const { isOnline } = useConnectivity();
    const [type, setType] = useState<PlaceType>("gas_station");
    const [places, setPlaces] = useState<NearbyPlace[]>([]);
    const [loading, setLoading] = useState(false);
    const permissionMessages = useMemo(() => ({
        disabled: t("locationAccessDisabled"),
        denied: t("locationPermissionDenied"),
    }), [t]);
    const placesMessages = useMemo(() => ({
        unavailable: t("placesUnavailable"),
        sessionExpired: t("sessionExpired"),
        notDeployed: t("placesNotDeployed"),
        busy: t("placesBusy"),
        notConfigured: t("placesNotConfigured"),
    }), [t]);

    const fetchNearby = useCallback(async () => {
        if (!isOnline) return;
        setLoading(true);
        try {
            const origin = await captureDeviceCoordinates({ permissionMessages });
            setPlaces(await searchNearbyPlaces(type, origin, placesMessages));
        } catch (error) {
            Alert.alert(t("nearby"), (error as Error).message);
        } finally {
            setLoading(false);
        }
    }, [isOnline, permissionMessages, placesMessages, t, type]);

    useEffect(() => { void fetchNearby(); }, [fetchNearby]);

    if (!isOnline) return <Screen contentStyle={styles.center}><EmptyState icon="cloud-offline-outline" title={t("offline")} body={t("nearbyOffline")} /></Screen>;
    return (
        <Screen>
            <SectionHeader title={t("nearby")} />
            <ChoiceChips<PlaceType> value={type} onChange={setType} options={[{ value: "gas_station", label: t("nearbyFuel"), icon: "water-outline" }, { value: "car_repair", label: t("nearbyService"), icon: "construct-outline" }]} />
            <Button label={t("retry")} icon="locate-outline" variant="secondary" onPress={() => void fetchNearby()} />
            {loading ? <LoadingState /> : places.length ? (
                <Card style={styles.list}>
                    {places.map((place, index) => (
                        <View key={place.placeId}>
                            <Row
                                icon={type === "gas_station" ? "water-outline" : "construct-outline"}
                                title={place.name}
                                subtitle={`${place.address}${place.rating ? ` · ★ ${place.rating} (${place.userRatingCount ?? 0})` : ""}${priceLabel(place.priceLevel)}`}
                                tone={place.openNow === false ? "red" : "green"}
                                onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query_place_id=${place.placeId}&query=${encodeURIComponent(place.name)}`)}
                            />
                            {index < places.length - 1 ? <View style={styles.divider} /> : null}
                        </View>
                    ))}
                </Card>
            ) : <EmptyState icon="location-outline" title={t("none")} body={t("nearby")} />}
        </Screen>
    );
}

function priceLabel(level?: string) {
    const prices: Record<string, string> = {
        PRICE_LEVEL_INEXPENSIVE: "€",
        PRICE_LEVEL_MODERATE: "€€",
        PRICE_LEVEL_EXPENSIVE: "€€€",
        PRICE_LEVEL_VERY_EXPENSIVE: "€€€€",
    };
    return prices[level ?? ""] ? ` · ${prices[level ?? ""]}` : "";
}

const styles = StyleSheet.create({
    center: { justifyContent: "center" },
    list: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
});
