import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { Button, Card, DateField, FormField, LoadingState, PresetOrCustomField, Screen, SectionHeader, SelectField, TimeField } from "../../components/ui";
import { LocationPickerField } from "../../components/LocationPickerField";
import { VehicleSelectField } from "../../components/VehicleSelectField";
import { releaseFeatures } from "../../config/releaseFeatures";
import { useSubscription } from "../../billing/SubscriptionProvider";
import { useFuelLogs } from "../../data/liveQueries";
import { DocumentDraft, ExpenseCategory, ExpenseDraft, PartDraft } from "../../data/models";
import { deleteExpense, loadExpense, saveDocument, saveExpense } from "../../data/repository";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { uuid } from "../../powersync/uuid";
import { useConnectivity } from "../../providers/ConnectivityProvider";
import { useGarage } from "../../providers/GarageProvider";
import { captureDocument, deleteStoredDocument, pickDocument, syncPendingDocuments } from "../../services/documentStorage";
import { recognizeReceipt } from "../../services/receiptOcr";
import { colors, spacing, typography } from "../../theme/tokens";
import { isIsoDate, isoDate, isoTime, toNumber } from "../../utils/tracking";

type Props = NativeStackScreenProps<RootStackParamList, "ExpenseForm">;
const blankPart = (): PartDraft => ({ name: "", partNumber: "", quantity: "1", unitCost: "", installedMileage: "", notes: "" });
const GENERAL_CATEGORIES: ExpenseCategory[] = ["parking", "toll", "tax", "wash", "repair", "other"];

export default function ExpenseFormScreen({ route, navigation }: Props) {
    const { isOnline } = useConnectivity();
    const { vehicles, selectedVehicleId, dataOwnerId, canWrite } = useGarage();
    const { canCreateDocument } = useSubscription();
    const { t, distanceUnit } = usePreferences();
    const persistedId = route.params?.expenseId;
    const expenseId = useRef(persistedId ?? uuid()).current;
    const receiptId = useRef(uuid()).current;
    const initialCategory = route.params?.category ?? "fuel";
    const [draft, setDraft] = useState<ExpenseDraft>({
        id: expenseId,
        source: route.params?.source,
        category: initialCategory,
        userId: dataOwnerId,
        vehicleId: route.params?.vehicleId || selectedVehicleId,
        title: GENERAL_CATEGORIES.includes(initialCategory) ? t(initialCategory) : "",
        amount: "",
        date: isoDate(),
        time: isoTime(),
        odometer: "",
        place: "",
        paymentMethod: "",
        notes: "",
        litres: "",
        pricePerLitre: "",
        fuelType: "",
        fullTank: true,
        validFrom: isoDate(),
        validTo: "",
        provider: "",
        latitude: "",
        longitude: "",
        energyKwh: "",
        pricePerKwh: "",
        batteryStartPercent: "",
        batteryEndPercent: "",
        chargerType: "",
        chargingSpeedKw: "",
        efficiencyKwhPer100Km: "",
        parts: [],
    });
    const [receipt, setReceipt] = useState<Awaited<ReturnType<typeof pickDocument>>>(null);
    const [loading, setLoading] = useState(Boolean(persistedId));
    const [busy, setBusy] = useState(false);
    const [ocrBusy, setOcrBusy] = useState(false);
    const { data: fuelLogs } = useFuelLogs(dataOwnerId, draft.vehicleId);
    const formTitle = persistedId ? t("editExpense") : t("addExpense");
    const fuelTypes = [
        { value: "gasoline", label: t("gasoline") },
        { value: "diesel", label: t("diesel") },
        { value: "lpg", label: t("lpg") },
        { value: "cng", label: t("cng") },
        { value: "hybrid", label: t("hybrid") },
        { value: "plug-in-hybrid", label: t("plugInHybrid") },
        { value: "electric", label: t("electric") },
        { value: "hydrogen", label: t("hydrogen") },
    ];
    const paymentMethods = [
        { value: "cash", label: t("cash") },
        { value: "credit-card", label: t("creditCard") },
        { value: "debit-card", label: t("debitCard") },
        { value: "bank-transfer", label: t("bankTransfer") },
        { value: "mobile-wallet", label: t("mobileWallet") },
        { value: "fuel-card", label: t("fuelCard") },
    ];
    const serviceTypes = [
        { value: "oil-change", label: t("oilChange") },
        { value: "scheduled-service", label: t("scheduledService") },
        { value: "tyres", label: t("tyres") },
        { value: "brakes", label: t("brakes") },
        { value: "battery", label: t("battery") },
        { value: "air-conditioning", label: t("airConditioning") },
        { value: "repair", label: t("repair") },
    ];
    const chargerTypes = [
        { value: "domestic-socket", label: "Domestic socket" },
        { value: "ac-type-2", label: "AC Type 2" },
        { value: "wallbox", label: "Wallbox" },
        { value: "dc-ccs", label: "DC CCS" },
        { value: "chademo", label: "CHAdeMO" },
        { value: "tesla-supercharger", label: "Tesla Supercharger" },
    ];

    useEffect(() => {
        if (!persistedId || !route.params?.source) return;
        void loadExpense(persistedId, route.params.source, dataOwnerId)
            .then((loaded) => {
                if (!loaded) return;
                const convert = (value: string) => distanceUnit === "mi" && value ? String(Math.round(toNumber(value) * 0.621371)) : value;
                setDraft({
                    ...loaded,
                    odometer: convert(loaded.odometer),
                    parts: loaded.parts.map((part) => ({ ...part, installedMileage: convert(part.installedMileage) })),
                });
            })
            .finally(() => setLoading(false));
    }, [dataOwnerId, distanceUnit, persistedId, route.params?.source]);

    useEffect(() => {
        if (!draft.vehicleId && selectedVehicleId) setDraft((current) => ({ ...current, vehicleId: selectedVehicleId }));
    }, [draft.vehicleId, selectedVehicleId]);

    useEffect(() => {
        if (persistedId || draft.category !== "fuel" || draft.fuelType) return;
        const vehicleFuelType = vehicles.find((vehicle) => vehicle.id === draft.vehicleId)?.vehicle_fuel_type;
        const previousFuelType = [...fuelLogs].reverse().find((log) => log.fuel_type)?.fuel_type;
        const preferredFuelType = vehicleFuelType || previousFuelType;
        if (preferredFuelType) setDraft((current) => current.fuelType ? current : { ...current, fuelType: preferredFuelType });
    }, [draft.category, draft.fuelType, draft.vehicleId, fuelLogs, persistedId, vehicles]);

    const update = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) =>
        setDraft((current) => ({ ...current, [key]: value }));

    const submit = async () => {
        if (!canWrite) {
            Alert.alert(formTitle, "Your garage role is view-only.");
            return;
        }
        const computedAmount = toNumber(draft.amount)
            || (draft.category === "fuel" ? toNumber(draft.litres) * toNumber(draft.pricePerLitre) : 0)
            || (draft.category === "charging" ? toNumber(draft.energyKwh) * toNumber(draft.pricePerKwh) : 0);
        if (!draft.vehicleId || computedAmount <= 0 || !isIsoDate(draft.date) || (draft.category === "fuel" && !draft.fuelType.trim()) || ((draft.category === "service" || GENERAL_CATEGORIES.includes(draft.category)) && !draft.title.trim())) {
            Alert.alert(formTitle, !isIsoDate(draft.date) ? t("invalidDate") : t("requiredFields"));
            return;
        }
        if (draft.category === "fuel" && toNumber(draft.litres) <= 0) {
            Alert.alert(formTitle, t("invalidNumber"));
            return;
        }
        if (draft.category === "charging" && toNumber(draft.energyKwh) <= 0) {
            Alert.alert(formTitle, "Enter the energy delivered in kWh.");
            return;
        }
        const startBattery = toNumber(draft.batteryStartPercent);
        const endBattery = toNumber(draft.batteryEndPercent);
        if ((draft.batteryStartPercent && (startBattery < 0 || startBattery > 100)) || (draft.batteryEndPercent && (endBattery < 0 || endBattery > 100))) {
            Alert.alert(formTitle, "Battery percentages must be between 0 and 100.");
            return;
        }
        if (receipt && !canCreateDocument) {
            navigation.navigate("Paywall", { source: "document" });
            return;
        }
        setBusy(true);
        try {
            const toStoredDistance = (value: string) => distanceUnit === "mi" && value ? String(Math.round(toNumber(value) / 0.621371)) : value;
            const storedDraft: ExpenseDraft = {
                ...draft,
                amount: String(computedAmount),
                odometer: toStoredDistance(draft.odometer),
                parts: draft.parts.map((part) => ({ ...part, installedMileage: toStoredDistance(part.installedMileage) })),
            };
            const saved = await saveExpense(storedDraft);
            if (receipt) {
                const document: DocumentDraft = {
                    id: receiptId,
                    userId: dataOwnerId,
                    vehicleId: draft.vehicleId,
                    title: `${t("receipt")} · ${draft.title || t(draft.category)}`,
                    category: "receipt",
                    fileName: receipt.fileName,
                    mimeType: receipt.mimeType,
                    fileSize: receipt.fileSize,
                    storagePath: `${dataOwnerId}/${draft.vehicleId}/${receiptId}-${receipt.fileName}`,
                    expirationDate: "",
                    notes: "",
                    relatedExpenseId: saved.id,
                    relatedExpenseType: saved.source,
                };
                await saveDocument(document);
                if (isOnline) void syncPendingDocuments(dataOwnerId);
            }
            Alert.alert(t("expenseSaved"));
            navigation.goBack();
        } catch (error) {
            Alert.alert(formTitle, (error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const confirmDelete = () => {
        if (!persistedId || !draft.source) return;
        Alert.alert(t("deleteExpenseTitle"), undefined, [
            { text: t("cancel"), style: "cancel" },
            { text: t("delete"), style: "destructive", onPress: () => void (async () => {
                const documents = await deleteExpense({ id: persistedId, source: draft.source!, user_id: dataOwnerId });
                await Promise.allSettled(documents.map((document) => deleteStoredDocument(document, isOnline)));
                navigation.goBack();
            })() },
        ]);
    };

    const attach = async () => {
        if (!canCreateDocument) {
            navigation.navigate("Paywall", { source: "document" });
            return;
        }
        try {
            const selected = await pickDocument(receiptId);
            if (selected) setReceipt(selected);
        } catch (error) {
            Alert.alert(t("attachReceipt"), (error as Error).message);
        }
    };

    const scanReceipt = async () => {
        if (!canCreateDocument) {
            navigation.navigate("Paywall", { source: "document" });
            return;
        }
        try {
            const captured = await captureDocument(receiptId);
            if (!captured) return;
            setReceipt(captured);
            if (!releaseFeatures.receiptOcr) {
                Alert.alert("Receipt saved", "The photo is attached. Enter the expense details and save when you are ready.");
                return;
            }
            if (!isOnline) {
                Alert.alert("Receipt saved", "The image is attached. OCR needs an internet connection, so you can enter the fields manually for now.");
                return;
            }
            setOcrBusy(true);
            const suggestion = await recognizeReceipt(captured.localUri);
            const summary = [
                suggestion.vendor && `Vendor: ${suggestion.vendor}`,
                suggestion.amount !== null && `Amount: ${suggestion.amount.toFixed(2)}`,
                suggestion.date && `Date: ${suggestion.date}`,
                `Category: ${suggestion.category}`,
            ].filter(Boolean).join("\n");
            Alert.alert("Receipt suggestions", summary, [
                { text: t("cancel"), style: "cancel" },
                {
                    text: "Apply",
                    onPress: () => setDraft((current) => ({
                        ...current,
                        category: suggestion.category,
                        title: suggestion.title || current.title,
                        amount: suggestion.amount !== null ? String(suggestion.amount) : current.amount,
                        date: suggestion.date || current.date,
                        place: suggestion.vendor || current.place,
                        paymentMethod: suggestion.paymentMethod || current.paymentMethod,
                        provider: suggestion.category === "insurance" ? suggestion.vendor || current.provider : current.provider,
                    })),
                },
            ]);
        } catch (error) {
            Alert.alert("Receipt OCR", `${(error as Error).message}\n\nThe receipt is still attached and you can enter the fields manually.`);
        } finally {
            setOcrBusy(false);
        }
    };

    if (loading) return <Screen><LoadingState /></Screen>;
    return (
        <Screen>
            <SectionHeader title={formTitle} />
            {!persistedId ? (
                <SelectField
                    label={t("expenseType")}
                    value={draft.category}
                    onChange={(category) => setDraft((current) => ({
                        ...current,
                        category,
                        title: GENERAL_CATEGORIES.includes(category) ? t(category) : "",
                        provider: "",
                    }))}
                    options={(["fuel", "charging", "service", "insurance", "parking", "toll", "tax", "wash", "repair", "other"] as ExpenseCategory[]).map((value) => ({ value, label: t(value) }))}
                />
            ) : null}
            <Card style={styles.form}>
                <VehicleSelectField vehicles={vehicles} value={draft.vehicleId} onChange={(vehicleId) => update("vehicleId", vehicleId)} />

                {draft.category === "fuel" ? (
                    <>
                        <View style={styles.columns}>
                            <View style={styles.column}><FormField label={t("litres")} value={draft.litres} onChangeText={(value) => update("litres", value)} keyboardType="decimal-pad" required /></View>
                            <View style={styles.column}><FormField label={t("pricePerLitre")} value={draft.pricePerLitre} onChangeText={(value) => update("pricePerLitre", value)} keyboardType="decimal-pad" /></View>
                        </View>
                        <PresetOrCustomField label={t("fuelType")} value={draft.fuelType} onChange={(value) => update("fuelType", value)} options={fuelTypes} placeholder={t("selectFuelType")} required />
                        <View style={styles.switchRow}><Text style={styles.switchLabel}>{t("fullTank")}</Text><Switch value={draft.fullTank} onValueChange={(value) => update("fullTank", value)} trackColor={{ true: colors.primary }} /></View>
                    </>
                ) : null}

                {draft.category === "charging" ? (
                    <>
                        <View style={styles.columns}>
                            <View style={styles.column}><FormField label="Energy (kWh)" value={draft.energyKwh} onChangeText={(value) => update("energyKwh", value)} keyboardType="decimal-pad" required /></View>
                            <View style={styles.column}><FormField label="Price per kWh" value={draft.pricePerKwh} onChangeText={(value) => update("pricePerKwh", value)} keyboardType="decimal-pad" /></View>
                        </View>
                        <View style={styles.columns}>
                            <View style={styles.column}><FormField label="Battery start (%)" value={draft.batteryStartPercent} onChangeText={(value) => update("batteryStartPercent", value)} keyboardType="decimal-pad" /></View>
                            <View style={styles.column}><FormField label="Battery end (%)" value={draft.batteryEndPercent} onChangeText={(value) => update("batteryEndPercent", value)} keyboardType="decimal-pad" /></View>
                        </View>
                        <PresetOrCustomField label="Charger type" value={draft.chargerType} onChange={(value) => update("chargerType", value)} options={chargerTypes} placeholder="Choose charger type" />
                        <View style={styles.columns}>
                            <View style={styles.column}><FormField label="Charging speed (kW)" value={draft.chargingSpeedKw} onChangeText={(value) => update("chargingSpeedKw", value)} keyboardType="decimal-pad" /></View>
                            <View style={styles.column}><FormField label="Efficiency (kWh/100 km)" value={draft.efficiencyKwhPer100Km} onChangeText={(value) => update("efficiencyKwhPer100Km", value)} keyboardType="decimal-pad" /></View>
                        </View>
                    </>
                ) : null}

                {draft.category === "service" ? <PresetOrCustomField label={t("serviceType")} value={draft.title} onChange={(value) => update("title", value)} options={serviceTypes} placeholder={t("selectServiceType")} required /> : null}
                {draft.category === "insurance" ? (
                    <>
                        <FormField label={t("insuranceProvider")} value={draft.provider} onChangeText={(value) => update("provider", value)} />
                        <View style={styles.columns}>
                            <View style={styles.column}><DateField label={t("validFrom")} value={draft.validFrom} onChange={(value) => { update("validFrom", value); update("date", value); }} required /></View>
                            <View style={styles.column}><DateField label={t("validTo")} value={draft.validTo} onChange={(value) => update("validTo", value)} minDate={draft.validFrom} /></View>
                        </View>
                    </>
                ) : null}
                {!["fuel", "service", "insurance"].includes(draft.category) ? <FormField label={t("title")} value={draft.title} onChangeText={(value) => update("title", value)} required /> : null}

                <FormField label={t("amount")} value={draft.amount} onChangeText={(value) => update("amount", value)} keyboardType="decimal-pad" hint={draft.category === "fuel" ? `${t("optional")} — ${t("litres")} × ${t("pricePerLitre")}` : draft.category === "charging" ? "Optional — kWh × price per kWh" : undefined} required={!['fuel', 'charging'].includes(draft.category)} />
                {draft.category !== "insurance" ? (
                    <View style={styles.columns}>
                        <View style={styles.column}><DateField label={t("date")} value={draft.date} onChange={(value) => update("date", value)} required /></View>
                        <View style={styles.column}><TimeField label={t("time")} value={draft.time} onChange={(value) => update("time", value)} /></View>
                    </View>
                ) : null}
                <FormField label={`${t("odometer")} (${distanceUnit})`} value={draft.odometer} onChangeText={(value) => update("odometer", value)} keyboardType="decimal-pad" />
                <LocationPickerField
                    label={t("place")}
                    value={draft.place}
                    latitude={draft.latitude}
                    longitude={draft.longitude}
                    onChange={(location) => setDraft((current) => ({ ...current, place: location.label, latitude: String(location.latitude), longitude: String(location.longitude) }))}
                    onClear={() => setDraft((current) => ({ ...current, place: "", latitude: "", longitude: "" }))}
                />
                <PresetOrCustomField label={t("paymentMethod")} value={draft.paymentMethod} onChange={(value) => update("paymentMethod", value)} options={paymentMethods} placeholder={t("selectPaymentMethod")} />
                <FormField label={t("notes")} value={draft.notes} onChangeText={(value) => update("notes", value)} multiline />
            </Card>

            {draft.category === "service" ? (
                <View style={styles.section}>
                    <SectionHeader title={t("partsReplaced")} />
                    {draft.parts.map((part, index) => (
                        <Card key={part.id ?? index} style={styles.form}>
                            <FormField label={t("partName")} value={part.name} onChangeText={(value) => updatePart(draft, setDraft, index, "name", value)} />
                            <View style={styles.columns}>
                                <View style={styles.column}><FormField label={t("quantity")} value={part.quantity} onChangeText={(value) => updatePart(draft, setDraft, index, "quantity", value)} keyboardType="decimal-pad" /></View>
                                <View style={styles.column}><FormField label={t("unitCost")} value={part.unitCost} onChangeText={(value) => updatePart(draft, setDraft, index, "unitCost", value)} keyboardType="decimal-pad" /></View>
                            </View>
                            <FormField label={t("partNumber")} value={part.partNumber} onChangeText={(value) => updatePart(draft, setDraft, index, "partNumber", value)} />
                            <FormField label={`${t("installedMileage")} (${distanceUnit})`} value={part.installedMileage} onChangeText={(value) => updatePart(draft, setDraft, index, "installedMileage", value)} keyboardType="decimal-pad" />
                            <Button label={t("removePart")} variant="ghost" compact onPress={() => update("parts", draft.parts.filter((_, partIndex) => partIndex !== index))} />
                        </Card>
                    ))}
                    <Button label={t("addPart")} icon="add" variant="secondary" onPress={() => update("parts", [...draft.parts, blankPart()])} />
                </View>
            ) : null}

            {!persistedId ? (
                <View style={styles.receiptActions}>
                    <Button label={receipt ? `${t("fileSelected")}: ${receipt.fileName}` : t("attachReceipt")} icon="attach-outline" variant="secondary" onPress={attach} />
                    <Button
                        label={releaseFeatures.receiptOcr ? "Scan receipt & suggest fields" : "Take receipt photo"}
                        icon={releaseFeatures.receiptOcr ? "scan-outline" : "camera-outline"}
                        variant="secondary"
                        onPress={() => void scanReceipt()}
                        loading={ocrBusy}
                    />
                </View>
            ) : null}
            <Button label={t("save")} icon="checkmark" onPress={submit} loading={busy} />
            {persistedId ? <Button label={t("delete")} icon="trash-outline" variant="danger" onPress={confirmDelete} /> : null}
        </Screen>
    );
}

function updatePart<K extends keyof PartDraft>(draft: ExpenseDraft, setDraft: React.Dispatch<React.SetStateAction<ExpenseDraft>>, index: number, key: K, value: PartDraft[K]) {
    const parts = draft.parts.map((part, partIndex) => partIndex === index ? { ...part, [key]: value } : part);
    setDraft((current) => ({ ...current, parts }));
}

const styles = StyleSheet.create({
    form: { gap: spacing.lg },
    section: { gap: spacing.md },
    columns: { flexDirection: "row", gap: spacing.md },
    column: { flex: 1 },
    label: { ...typography.label, color: colors.ink, marginBottom: -spacing.sm },
    switchRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    switchLabel: { ...typography.bodyStrong, color: colors.ink },
    receiptActions: { gap: spacing.sm },
});
