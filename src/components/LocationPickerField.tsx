import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    StatusBar as NativeStatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import MapView, { MapPressEvent, Marker, MarkerDragStartEndEvent, Region } from "react-native-maps";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureCurrentLocation, resolveLocationLabel } from "../services/currentLocation";
import { colors, radius, shadow, spacing, typography } from "../theme/tokens";
import { GOOGLE_API_KEY } from "../utils/location";

export type PickedLocation = {
    label: string;
    latitude: number;
    longitude: number;
};

type Prediction = { place_id: string; description: string };

const DEFAULT_REGION: Region = {
    latitude: 51,
    longitude: 10,
    latitudeDelta: 8,
    longitudeDelta: 8,
};

export function LocationPickerField({
    label,
    value,
    latitude,
    longitude,
    onChange,
    onClear,
}: {
    label: string;
    value: string;
    latitude: string;
    longitude: string;
    onChange: (location: PickedLocation) => void;
    onClear: () => void;
}) {
    const [visible, setVisible] = useState(false);
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const hasCoordinates = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude) && Boolean(latitude && longitude);

    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => setVisible(true)}
                style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
            >
                <View style={styles.triggerIcon}><Ionicons name="location-outline" size={20} color={colors.primary} /></View>
                <View style={styles.triggerText}>
                    <Text numberOfLines={2} style={[styles.triggerValue, !value && styles.placeholder]}>
                        {value || "Search an address or choose on the map"}
                    </Text>
                    {hasCoordinates ? <Text style={styles.coordinates}>{parsedLatitude.toFixed(5)}, {parsedLongitude.toFixed(5)}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
            </Pressable>
            <Text style={styles.hint}>Optional · tap to search, use your location, or place a pin manually.</Text>
            <LocationPickerModal
                visible={visible}
                initialValue={value}
                initialLocation={hasCoordinates ? { label: value, latitude: parsedLatitude, longitude: parsedLongitude } : null}
                onCancel={() => setVisible(false)}
                onClear={() => {
                    onClear();
                    setVisible(false);
                }}
                onConfirm={(location) => {
                    onChange(location);
                    setVisible(false);
                }}
            />
        </View>
    );
}

function LocationPickerModal({
    visible,
    initialValue,
    initialLocation,
    onCancel,
    onClear,
    onConfirm,
}: {
    visible: boolean;
    initialValue: string;
    initialLocation: PickedLocation | null;
    onCancel: () => void;
    onClear: () => void;
    onConfirm: (location: PickedLocation) => void;
}) {
    const insets = useSafeAreaInsets();
    const safeTop = insets.top || (Platform.OS === "ios" ? 44 : NativeStatusBar.currentHeight ?? 24);
    const safeBottom = insets.bottom || (Platform.OS === "ios" ? 20 : 0);
    const mapRef = useRef<MapView>(null);
    const [query, setQuery] = useState(initialValue);
    const [selection, setSelection] = useState<PickedLocation | null>(initialLocation);
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [searching, setSearching] = useState(false);
    const [locating, setLocating] = useState(false);
    const [resolving, setResolving] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setQuery(initialValue);
        setSelection(initialLocation);
        setPredictions([]);
        const timer = setTimeout(() => {
            if (initialLocation) animateTo(initialLocation.latitude, initialLocation.longitude, mapRef.current);
        }, 250);
        return () => clearTimeout(timer);
    }, [initialLocation, initialValue, visible]);

    useEffect(() => {
        if (!visible || !GOOGLE_API_KEY || query.trim().length < 3 || query.trim() === selection?.label) {
            setPredictions([]);
            return;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => {
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query.trim())}&key=${encodeURIComponent(GOOGLE_API_KEY)}`;
            void fetch(url, { signal: controller.signal })
                .then((response) => response.json())
                .then((payload) => {
                    if (payload.status === "OK") setPredictions(payload.predictions ?? []);
                    else setPredictions([]);
                })
                .catch(() => undefined);
        }, 350);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, selection?.label, visible]);

    const chooseCoordinates = async (latitude: number, longitude: number, suppliedLabel?: string) => {
        const temporaryLabel = suppliedLabel || "Finding this address…";
        setSelection({ latitude, longitude, label: temporaryLabel });
        animateTo(latitude, longitude, mapRef.current);
        setResolving(true);
        try {
            const locationLabel = suppliedLabel || await reverseGeocode(latitude, longitude);
            const next = { latitude, longitude, label: locationLabel };
            setSelection(next);
            setQuery(locationLabel);
            setPredictions([]);
            animateTo(latitude, longitude, mapRef.current);
        } catch (error) {
            Alert.alert("Choose location", (error as Error).message);
        } finally {
            setResolving(false);
        }
    };

    const searchAddress = async () => {
        const address = query.trim();
        if (!address) return;
        setSearching(true);
        Keyboard.dismiss();
        try {
            const result = await geocodeAddress(address);
            await chooseCoordinates(result.latitude, result.longitude, result.label);
        } catch (error) {
            Alert.alert("Address search", (error as Error).message);
        } finally {
            setSearching(false);
        }
    };

    const choosePrediction = async (prediction: Prediction) => {
        setSearching(true);
        Keyboard.dismiss();
        try {
            const result = await placeDetails(prediction.place_id, prediction.description);
            await chooseCoordinates(result.latitude, result.longitude, result.label);
        } catch (error) {
            Alert.alert("Address search", (error as Error).message);
        } finally {
            setSearching(false);
        }
    };

    const chooseCurrentLocation = async () => {
        setLocating(true);
        Keyboard.dismiss();
        try {
            const current = await captureCurrentLocation();
            setSelection(current);
            setQuery(current.label);
            setPredictions([]);
            animateTo(current.latitude, current.longitude, mapRef.current);
        } catch (error) {
            Alert.alert("Current location", (error as Error).message);
        } finally {
            setLocating(false);
        }
    };

    const selectFromMap = (event: MapPressEvent | MarkerDragStartEndEvent) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        Keyboard.dismiss();
        setPredictions([]);
        void chooseCoordinates(latitude, longitude);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
            onRequestClose={onCancel}
        >
            <StatusBar style="dark" translucent backgroundColor="transparent" />
            <View style={styles.modal}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    initialRegion={initialLocation ? regionFor(initialLocation.latitude, initialLocation.longitude) : DEFAULT_REGION}
                    mapPadding={{ top: safeTop + 142, right: spacing.md, bottom: safeBottom + 214, left: spacing.md }}
                    onPress={selectFromMap}
                    showsUserLocation
                    showsMyLocationButton={false}
                    showsCompass
                    loadingEnabled
                    loadingBackgroundColor={colors.canvas}
                    toolbarEnabled={false}
                    moveOnMarkerPress={false}
                >
                    {selection ? <Marker coordinate={selection} draggable onDragEnd={selectFromMap} title={selection.label || "Selected location"} /> : null}
                </MapView>

                <View style={[styles.topControls, { top: safeTop + spacing.sm }]} pointerEvents="box-none">
                    <Pressable
                        onPress={onCancel}
                        style={({ pressed }) => [styles.roundControl, pressed && styles.controlPressed]}
                        accessibilityRole="button"
                        accessibilityLabel="Close location picker"
                    >
                        <Ionicons name="close" size={25} color={colors.ink} />
                    </Pressable>
                    <View style={styles.titlePill}>
                        <Ionicons name="map-outline" size={18} color={colors.primary} />
                        <Text numberOfLines={1} style={styles.floatingTitle}>Choose location</Text>
                    </View>
                    <View style={styles.controlSpacer} />
                </View>

                <View style={[styles.searchPanel, { top: safeTop + 66 }]}>
                    <View style={styles.searchRow}>
                        <Ionicons name="search" size={20} color={colors.inkMuted} />
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            onSubmitEditing={() => void searchAddress()}
                            placeholder="Search address, station, or workshop"
                            placeholderTextColor={colors.inkMuted}
                            returnKeyType="search"
                            autoCorrect={false}
                            style={styles.searchInput}
                            accessibilityLabel="Search address"
                        />
                        {query.length > 0 && !searching ? (
                            <Pressable
                                onPress={() => {
                                    setQuery("");
                                    setPredictions([]);
                                }}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Clear address search"
                            >
                                <Ionicons name="close-circle" size={21} color={colors.borderStrong} />
                            </Pressable>
                        ) : null}
                        {searching ? <ActivityIndicator color={colors.primary} /> : (
                            <Pressable onPress={() => void searchAddress()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Search">
                                <View style={styles.searchSubmit}><Ionicons name="arrow-forward" size={19} color={colors.white} /></View>
                            </Pressable>
                        )}
                    </View>
                    {predictions.length ? (
                        <FlatList
                            data={predictions.slice(0, 5)}
                            keyExtractor={(item) => item.place_id}
                            keyboardShouldPersistTaps="handled"
                            style={styles.predictions}
                            renderItem={({ item }) => (
                                <Pressable style={({ pressed }) => [styles.prediction, pressed && styles.predictionPressed]} onPress={() => void choosePrediction(item)}>
                                    <View style={styles.predictionIcon}><Ionicons name="location-outline" size={17} color={colors.primary} /></View>
                                    <Text numberOfLines={2} style={styles.predictionText}>{item.description}</Text>
                                </Pressable>
                            )}
                        />
                    ) : null}
                </View>

                <Pressable
                    style={({ pressed }) => [styles.locateButton, { bottom: safeBottom + 220 }, pressed && styles.locatePressed]}
                    onPress={() => void chooseCurrentLocation()}
                    accessibilityRole="button"
                    accessibilityLabel="Use current location"
                >
                    {locating ? <ActivityIndicator color={colors.white} /> : <Ionicons name="locate" size={25} color={colors.white} />}
                </Pressable>

                <View style={[styles.instructions, { bottom: safeBottom + 222 }]} pointerEvents="none">
                    <Ionicons name="hand-left-outline" size={15} color={colors.inkMuted} />
                    <Text style={styles.instructionsText}>Tap the map or drag the pin</Text>
                </View>

                <View style={[styles.selectionPanel, { paddingBottom: Math.max(safeBottom, spacing.md) }]}>
                    <View style={styles.grabber} />
                    <View style={styles.selectionHeader}>
                        <Text style={styles.selectionLabel}>SELECTED LOCATION</Text>
                        {selection ? (
                            <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear selected location">
                                <Text style={styles.clearText}>Clear</Text>
                            </Pressable>
                        ) : null}
                    </View>
                    <View style={styles.selectionRow}>
                        <View style={styles.selectionIcon}><Ionicons name="location" size={21} color={colors.primary} /></View>
                        <View style={styles.selectionCopy}>
                            <Text numberOfLines={2} style={[styles.selectionValue, !selection && styles.placeholder]}>
                                {selection?.label || "Search above or tap anywhere on the map"}
                            </Text>
                            {selection ? (
                                <Text style={styles.selectionCoordinates}>{selection.latitude.toFixed(5)}, {selection.longitude.toFixed(5)}</Text>
                            ) : null}
                        </View>
                        {resolving ? <ActivityIndicator color={colors.primary} /> : null}
                    </View>
                    <Pressable
                        disabled={!selection || resolving}
                        onPress={() => selection && onConfirm(selection)}
                        style={({ pressed }) => [styles.confirmButton, (!selection || resolving) && styles.confirmDisabled, pressed && selection && !resolving && styles.confirmPressed]}
                        accessibilityRole="button"
                        accessibilityLabel="Use selected location"
                    >
                        <Ionicons name="checkmark-circle" size={21} color={colors.white} />
                        <Text style={styles.confirmText}>Use this location</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

async function reverseGeocode(latitude: number, longitude: number) {
    if (GOOGLE_API_KEY) {
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${encodeURIComponent(GOOGLE_API_KEY)}`);
        const payload = await response.json();
        if (response.ok && payload.status === "OK" && payload.results?.[0]?.formatted_address) return payload.results[0].formatted_address as string;
    }
    return resolveLocationLabel(latitude, longitude);
}

async function geocodeAddress(address: string): Promise<PickedLocation> {
    if (GOOGLE_API_KEY) {
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${encodeURIComponent(GOOGLE_API_KEY)}`);
        const payload = await response.json();
        if (!response.ok || payload.status !== "OK" || !payload.results?.[0]) throw new Error(payload.error_message || "No matching address was found.");
        const result = payload.results[0];
        return { latitude: result.geometry.location.lat, longitude: result.geometry.location.lng, label: result.formatted_address || address };
    }
    const results = await Location.geocodeAsync(address);
    if (!results[0]) throw new Error("No matching address was found. Add a Google Maps key for richer address search.");
    const first = results[0];
    return { latitude: first.latitude, longitude: first.longitude, label: await resolveLocationLabel(first.latitude, first.longitude) };
}

async function placeDetails(placeId: string, fallbackLabel: string): Promise<PickedLocation> {
    if (!GOOGLE_API_KEY) return geocodeAddress(fallbackLabel);
    const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,geometry,name&key=${encodeURIComponent(GOOGLE_API_KEY)}`);
    const payload = await response.json();
    if (!response.ok || payload.status !== "OK" || !payload.result?.geometry?.location) throw new Error(payload.error_message || "This place could not be opened.");
    return {
        latitude: payload.result.geometry.location.lat,
        longitude: payload.result.geometry.location.lng,
        label: payload.result.formatted_address || payload.result.name || fallbackLabel,
    };
}

function regionFor(latitude: number, longitude: number): Region {
    return { latitude, longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 };
}

function animateTo(latitude: number, longitude: number, map: MapView | null) {
    map?.animateToRegion(regionFor(latitude, longitude), 350);
}

const styles = StyleSheet.create({
    field: { gap: spacing.xs },
    fieldLabel: { ...typography.label, color: colors.ink },
    trigger: { minHeight: 72, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm },
    pressed: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    triggerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
    triggerText: { flex: 1, minWidth: 0, gap: 3 },
    triggerValue: { ...typography.body, color: colors.ink },
    coordinates: { ...typography.caption, color: colors.inkMuted },
    placeholder: { color: colors.inkMuted },
    hint: { ...typography.caption, color: colors.inkMuted },
    modal: { flex: 1, backgroundColor: colors.canvas },
    topControls: { position: "absolute", left: spacing.md, right: spacing.md, zIndex: 30, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
    roundControl: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.96)", ...shadow },
    controlPressed: { transform: [{ scale: 0.96 }], backgroundColor: colors.primarySoft },
    controlSpacer: { width: 46, height: 46 },
    titlePill: { minHeight: 44, maxWidth: "68%", paddingHorizontal: spacing.lg, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: "rgba(255,255,255,0.96)", ...shadow },
    floatingTitle: { ...typography.bodyStrong, color: colors.ink },
    searchPanel: { position: "absolute", left: spacing.md, right: spacing.md, zIndex: 29, borderRadius: radius.lg, backgroundColor: "rgba(255,255,255,0.98)", overflow: "hidden", ...shadow },
    searchRow: { minHeight: 58, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
    searchInput: { flex: 1, ...typography.body, color: colors.ink, paddingVertical: spacing.sm },
    searchSubmit: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
    predictions: { maxHeight: 280, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    prediction: { minHeight: 58, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    predictionPressed: { backgroundColor: colors.primarySoft },
    predictionIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
    predictionText: { flex: 1, ...typography.body, color: colors.ink },
    locateButton: { position: "absolute", right: spacing.md, zIndex: 15, width: 54, height: 54, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", ...shadow },
    locatePressed: { transform: [{ scale: 0.96 }], backgroundColor: colors.primaryDark },
    instructions: { position: "absolute", left: spacing.md, zIndex: 14, minHeight: 38, maxWidth: "65%", paddingHorizontal: spacing.md, borderRadius: radius.md, flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: "rgba(255,255,255,0.96)", ...shadow },
    instructionsText: { ...typography.caption, color: colors.inkMuted },
    selectionPanel: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 20, minHeight: 202, paddingTop: spacing.sm, paddingHorizontal: spacing.lg, gap: spacing.sm, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "rgba(255,255,255,0.99)", ...shadow },
    grabber: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: spacing.xs },
    selectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    selectionRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: spacing.md },
    selectionIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
    selectionCopy: { flex: 1, minWidth: 0, gap: 2 },
    selectionLabel: { ...typography.caption, color: colors.inkMuted, letterSpacing: 0.6 },
    selectionValue: { ...typography.bodyStrong, color: colors.ink },
    selectionCoordinates: { ...typography.caption, color: colors.inkMuted },
    clearText: { ...typography.bodyStrong, color: colors.primary },
    confirmButton: { minHeight: 52, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary },
    confirmDisabled: { opacity: 0.4 },
    confirmPressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.99 }] },
    confirmText: { ...typography.bodyStrong, color: colors.white },
});
