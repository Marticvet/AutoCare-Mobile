import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import MapView, { MapPressEvent, Marker, MarkerDragStartEndEvent, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureCurrentLocation, captureDeviceCoordinates, resolveLocationLabel } from "../services/currentLocation";
import {
    autocompletePlaces,
    getPlaceDetails,
    PlaceOrigin,
    PlaceSuggestion,
    searchClosestPlace,
} from "../services/googlePlaces";
import { colors, radius, shadow, spacing, typography } from "../theme/tokens";
import { usePreferences } from "../i18n/PreferencesProvider";

export type PickedLocation = {
    label: string;
    latitude: number;
    longitude: number;
};

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
    const { t } = usePreferences();
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
                        {value || t("locationFieldPlaceholder")}
                    </Text>
                    {hasCoordinates ? <Text style={styles.coordinates}>{parsedLatitude.toFixed(5)}, {parsedLongitude.toFixed(5)}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
            </Pressable>
            <Text style={styles.hint}>{t("locationFieldHint")}</Text>
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
    const { t } = usePreferences();
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
    const insets = useSafeAreaInsets();
    const safeTop = insets.top || (Platform.OS === "ios" ? 44 : NativeStatusBar.currentHeight ?? 24);
    const safeBottom = insets.bottom || (Platform.OS === "ios" ? 20 : 0);
    const mapRef = useRef<MapView>(null);
    const mapReadyRef = useRef(false);
    const pendingCenterRef = useRef<PlaceOrigin | null>(null);
    const [query, setQuery] = useState(initialValue);
    const [selection, setSelection] = useState<PickedLocation | null>(initialLocation);
    const [predictions, setPredictions] = useState<PlaceSuggestion[]>([]);
    const [searchOrigin, setSearchOrigin] = useState<PlaceOrigin | null>(null);
    const [initialMapRegion, setInitialMapRegion] = useState<Region | null>(
        initialLocation ? regionFor(initialLocation.latitude, initialLocation.longitude) : null
    );
    const [searching, setSearching] = useState(false);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [suggestionsError, setSuggestionsError] = useState("");
    const [locating, setLocating] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [showInstructions, setShowInstructions] = useState(!initialLocation);

    const centerMap = (latitude: number, longitude: number) => {
        pendingCenterRef.current = { latitude, longitude };
        if (mapReadyRef.current) animateTo(latitude, longitude, mapRef.current);
    };

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        mapReadyRef.current = false;
        setQuery(initialValue);
        setSelection(initialLocation);
        setPredictions([]);
        setSuggestionsLoading(false);
        setSuggestionsError("");
        setShowInstructions(!initialLocation);
        if (initialLocation) {
            pendingCenterRef.current = initialLocation;
            setSearchOrigin(initialLocation);
            setInitialMapRegion(regionFor(initialLocation.latitude, initialLocation.longitude));
            setLocating(false);
        } else {
            pendingCenterRef.current = null;
            setSearchOrigin(null);
            setInitialMapRegion(null);
            setLocating(true);
        }
        const animateTimer = setTimeout(() => {
            if (initialLocation) centerMap(initialLocation.latitude, initialLocation.longitude);
            void captureDeviceCoordinates({ allowRecentLocation: true, permissionMessages })
                .then((current) => {
                    if (cancelled) return;
                    setSearchOrigin(current);
                    if (!initialLocation) {
                        pendingCenterRef.current = current;
                        setInitialMapRegion(regionFor(current.latitude, current.longitude));
                    }
                })
                .catch((error) => {
                    if (!cancelled && !initialLocation) {
                        setInitialMapRegion(DEFAULT_REGION);
                        Alert.alert(t("currentLocation"), (error as Error).message);
                    }
                })
                .finally(() => {
                    if (!cancelled && !initialLocation) setLocating(false);
                });
        }, 250);
        const instructionTimer = setTimeout(() => setShowInstructions(false), 4500);
        return () => {
            cancelled = true;
            clearTimeout(animateTimer);
            clearTimeout(instructionTimer);
        };
    }, [initialLocation, initialValue, permissionMessages, t, visible]);

    useEffect(() => {
        if (!visible || query.trim().length < 3 || query.trim() === selection?.label) {
            setPredictions([]);
            setSuggestionsLoading(false);
            setSuggestionsError("");
            return;
        }
        let cancelled = false;
        setSuggestionsError("");
        const timer = setTimeout(() => {
            setSuggestionsLoading(true);
            void autocompletePlaces(query.trim(), searchOrigin, placesMessages)
                .then((results) => {
                    if (!cancelled) {
                        setPredictions(results);
                        setSuggestionsError(results.length ? "" : t("noNearbyMatches"));
                    }
                })
                .catch((error) => {
                    if (!cancelled) {
                        setPredictions([]);
                        setSuggestionsError((error as Error).message);
                    }
                })
                .finally(() => {
                    if (!cancelled) setSuggestionsLoading(false);
                });
        }, 350);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [placesMessages, query, searchOrigin, selection?.label, t, visible]);

    const chooseCoordinates = async (latitude: number, longitude: number, suppliedLabel?: string) => {
        setShowInstructions(false);
        const temporaryLabel = suppliedLabel || t("findingAddress");
        setSelection({ latitude, longitude, label: temporaryLabel });
        centerMap(latitude, longitude);
        setResolving(true);
        try {
            const locationLabel = suppliedLabel || await reverseGeocode(latitude, longitude);
            const next = { latitude, longitude, label: locationLabel };
            setSelection(next);
            setQuery(locationLabel);
            setPredictions([]);
            centerMap(latitude, longitude);
        } catch (error) {
            Alert.alert(t("chooseLocation"), (error as Error).message);
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
            const result = await geocodeAddress(address, searchOrigin, t("noMatchingLocation"), placesMessages);
            await chooseCoordinates(result.latitude, result.longitude, result.label);
        } catch (error) {
            Alert.alert(t("addressSearch"), (error as Error).message);
        } finally {
            setSearching(false);
        }
    };

    const choosePrediction = async (prediction: PlaceSuggestion) => {
        setSearching(true);
        Keyboard.dismiss();
        try {
            const result = await getPlaceDetails(prediction.placeId, placesMessages);
            await chooseCoordinates(result.latitude, result.longitude, result.label);
        } catch (error) {
            Alert.alert(t("addressSearch"), (error as Error).message);
        } finally {
            setSearching(false);
        }
    };

    const chooseCurrentLocation = async () => {
        setShowInstructions(false);
        setLocating(true);
        Keyboard.dismiss();
        try {
            const current = await captureCurrentLocation(permissionMessages);
            setSearchOrigin(current);
            setSelection(current);
            setQuery(current.label);
            setPredictions([]);
            centerMap(current.latitude, current.longitude);
        } catch (error) {
            Alert.alert(t("currentLocation"), (error as Error).message);
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
                {initialMapRegion ? (
                    <MapView
                        ref={mapRef}
                        provider={Platform.OS === "ios" ? PROVIDER_GOOGLE : undefined}
                        style={StyleSheet.absoluteFill}
                        initialRegion={initialMapRegion}
                        mapPadding={{ top: safeTop + 142, right: spacing.md, bottom: safeBottom + 214, left: spacing.md }}
                        onPress={selectFromMap}
                        showsUserLocation
                        showsMyLocationButton={false}
                        showsCompass
                        rotateEnabled
                        pitchEnabled
                        scrollDuringRotateOrZoomEnabled
                        loadingEnabled
                        loadingBackgroundColor={colors.canvas}
                        toolbarEnabled={false}
                        moveOnMarkerPress={false}
                        onMapReady={() => {
                            mapReadyRef.current = true;
                            const pending = pendingCenterRef.current;
                            if (pending) animateTo(pending.latitude, pending.longitude, mapRef.current);
                        }}
                    >
                        {selection ? <Marker coordinate={selection} draggable onDragEnd={selectFromMap} title={selection.label || t("selectedLocation")} /> : null}
                    </MapView>
                ) : (
                    <View style={styles.mapBoot}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.mapBootText}>{t("findingLocation")}</Text>
                    </View>
                )}

                <View style={[styles.topControls, { top: safeTop + spacing.sm }]} pointerEvents="box-none">
                    <Pressable
                        onPress={onCancel}
                        style={({ pressed }) => [styles.roundControl, pressed && styles.controlPressed]}
                        accessibilityRole="button"
                        accessibilityLabel={t("closeLocationPicker")}
                    >
                        <Ionicons name="close" size={25} color={colors.ink} />
                    </Pressable>
                    <View style={styles.titlePill}>
                        <Ionicons name="map-outline" size={18} color={colors.primary} />
                        <Text numberOfLines={1} style={styles.floatingTitle}>{t("chooseLocation")}</Text>
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
                            placeholder={t("locationSearchPlaceholder")}
                            placeholderTextColor={colors.inkMuted}
                            returnKeyType="search"
                            autoCorrect={false}
                            style={styles.searchInput}
                            accessibilityLabel={t("searchAddress")}
                        />
                        {query.length > 0 && !searching ? (
                            <Pressable
                                onPress={() => {
                                    setQuery("");
                                    setPredictions([]);
                                    setSuggestionsError("");
                                }}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel={t("clearAddressSearch")}
                            >
                                <Ionicons name="close-circle" size={21} color={colors.borderStrong} />
                            </Pressable>
                        ) : null}
                        {searching ? <ActivityIndicator color={colors.primary} /> : query.trim().length > 0 ? (
                            <Pressable onPress={() => void searchAddress()} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("search")}>
                                <View style={styles.searchSubmit}><Ionicons name="arrow-forward" size={19} color={colors.white} /></View>
                            </Pressable>
                        ) : null}
                    </View>
                    {predictions.length ? (
                        <FlatList
                            data={predictions.slice(0, 5)}
                            keyExtractor={(item) => item.placeId}
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
                    {suggestionsLoading ? (
                        <View style={styles.suggestionStatus}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.suggestionStatusText}>{t("searchingNearbyPlaces")}</Text>
                        </View>
                    ) : suggestionsError ? (
                        <Text style={[styles.suggestionStatus, styles.suggestionError]}>{suggestionsError}</Text>
                    ) : null}
                </View>

                <Pressable
                    style={({ pressed }) => [styles.locateButton, { bottom: safeBottom + 220 }, pressed && styles.locatePressed]}
                    onPress={() => void chooseCurrentLocation()}
                    accessibilityRole="button"
                    accessibilityLabel={t("useCurrentLocation")}
                >
                    {locating ? <ActivityIndicator color={colors.white} /> : <Ionicons name="locate" size={25} color={colors.white} />}
                </Pressable>

                {showInstructions ? (
                    <View style={[styles.instructions, { bottom: safeBottom + 222 }]} pointerEvents="none">
                        <Ionicons name="hand-left-outline" size={15} color={colors.inkMuted} />
                        <Text style={styles.instructionsText}>{t("mapPinInstruction")}</Text>
                    </View>
                ) : null}

                <View style={[styles.selectionPanel, { paddingBottom: Math.max(safeBottom, spacing.md) }]}>
                    <View style={styles.grabber} />
                    <View style={styles.selectionHeader}>
                        <Text style={styles.selectionLabel}>{t("selectedLocationHeading")}</Text>
                        {selection ? (
                            <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("clearSelectedLocation")}>
                                <Text style={styles.clearText}>{t("clear")}</Text>
                            </Pressable>
                        ) : null}
                    </View>
                    <View style={styles.selectionRow}>
                        <View style={styles.selectionIcon}><Ionicons name="location" size={21} color={colors.primary} /></View>
                        <View style={styles.selectionCopy}>
                            <Text numberOfLines={2} style={[styles.selectionValue, !selection && styles.placeholder]}>
                                {selection?.label || t("locationEmptyBody")}
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
                        accessibilityLabel={t("useSelectedLocation")}
                    >
                        <Ionicons name="checkmark-circle" size={21} color={colors.white} />
                        <Text style={styles.confirmText}>{t("useThisLocation")}</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

async function reverseGeocode(latitude: number, longitude: number) {
    return resolveLocationLabel(latitude, longitude);
}

async function geocodeAddress(
    address: string,
    origin: PlaceOrigin | null,
    noMatchMessage: string,
    placesMessages: Parameters<typeof searchClosestPlace>[2]
): Promise<PickedLocation> {
    let placesError: unknown;
    try {
        const place = await searchClosestPlace(address, origin, placesMessages);
        if (place) return place;
    } catch (error) {
        placesError = error;
    }
    const results = await Location.geocodeAsync(address);
    if (results[0]) {
        const first = results[0];
        return { latitude: first.latitude, longitude: first.longitude, label: await resolveLocationLabel(first.latitude, first.longitude) };
    }
    if (placesError instanceof Error) throw placesError;
    throw new Error(noMatchMessage);
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
    mapBoot: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.canvas },
    mapBootText: { ...typography.bodyStrong, color: colors.inkMuted },
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
    suggestionStatus: { minHeight: 40, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    suggestionStatusText: { ...typography.caption, color: colors.inkMuted },
    suggestionError: { ...typography.caption, color: colors.danger },
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
