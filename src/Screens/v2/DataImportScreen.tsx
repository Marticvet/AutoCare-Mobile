import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Card, EmptyState, Row, Screen, SectionHeader, SelectField } from "../../components/ui";
import { VehicleSelectField } from "../../components/VehicleSelectField";
import { useExpenses } from "../../data/liveQueries";
import { saveExpense } from "../../data/repository";
import { uuid } from "../../powersync/uuid";
import { useGarage } from "../../providers/GarageProvider";
import { CsvImportSource, mapCsvExpenses, parseCsv } from "../../services/csvImport";
import { colors, spacing, typography } from "../../theme/tokens";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { TranslationKey } from "../../i18n/translations";

type Preview = ReturnType<typeof mapCsvExpenses> & { fileName: string; headers: string[] };

const IMPORT_REASON_KEYS: Record<string, TranslationKey> = {
    "Date could not be recognized": "importDateUnrecognized",
    "Amount is missing or zero": "importAmountMissing",
    "Fuel volume is missing": "importFuelVolumeMissing",
    "Charging energy is missing": "importChargingEnergyMissing",
};

export default function DataImportScreen() {
    const { t } = usePreferences();
    const { vehicles, selectedVehicleId, dataOwnerId, canWrite } = useGarage();
    const { data: existingExpenses } = useExpenses(dataOwnerId);
    const [source, setSource] = useState<CsvImportSource>("fuelio");
    const [vehicleId, setVehicleId] = useState(selectedVehicleId || vehicles[0]?.id || "");
    const [preview, setPreview] = useState<Preview | null>(null);
    const [busy, setBusy] = useState(false);
    const existingFingerprints = useMemo(
        () => new Set(existingExpenses.map((expense) => expense.external_id).filter(Boolean)),
        [existingExpenses]
    );
    const newExpenses = preview?.expenses.filter((entry) => !existingFingerprints.has(entry.fingerprint)) ?? [];
    const duplicates = (preview?.expenses.length ?? 0) - newExpenses.length;

    const chooseFile = async () => {
        if (!vehicleId) {
            Alert.alert(t("csvImport"), t("chooseImportVehicle"));
            return;
        }
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["text/csv", "text/comma-separated-values", "text/plain", "application/vnd.ms-excel"],
                copyToCacheDirectory: true,
                multiple: false,
            });
            if (result.canceled || !result.assets[0]) return;
            const asset = result.assets[0];
            const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
            const csv = parseCsv(text);
            if (csv.headers.length < 2 || !csv.rows.length) throw new Error(t("invalidCsvRows"));
            const mapped = mapCsvExpenses({
                csv,
                source,
                userId: dataOwnerId,
                vehicleId,
                batchId: uuid(),
                defaultTitles: {
                    fuel: t("fuel"),
                    charging: t("charging"),
                    service: t("importedService"),
                    insurance: t("insurance"),
                    parking: t("parking"),
                    toll: t("toll"),
                    tax: t("tax"),
                    wash: t("wash"),
                    repair: t("repair"),
                    other: t("importedExpense"),
                },
            });
            setPreview({ ...mapped, fileName: asset.name, headers: csv.headers });
        } catch (error) {
            Alert.alert(t("csvImport"), (error as Error).message);
        }
    };

    const runImport = async () => {
        if (!preview || !canWrite) return;
        setBusy(true);
        let imported = 0;
        const errors: string[] = [];
        const seen = new Set(existingFingerprints);
        try {
            for (const entry of preview.expenses) {
                if (seen.has(entry.fingerprint)) continue;
                try {
                    await saveExpense(entry.draft);
                    seen.add(entry.fingerprint);
                    imported += 1;
                } catch (error) {
                    errors.push(t("rowError", { row: entry.rowNumber, message: (error as Error).message }));
                }
            }
            Alert.alert(
                t("importComplete"),
                t("importCompleteBody", { imported, duplicates, invalid: preview.rejected.length, failed: errors.length })
            );
            if (!errors.length) setPreview(null);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Screen>
            <SectionHeader title={t("importHistory")} />
            <Card style={styles.form}>
                <Text style={styles.body}>{t("importHistoryIntro")}</Text>
                <SelectField
                    label={t("fileFormat")}
                    value={source}
                    onChange={(value) => { setSource(value); setPreview(null); }}
                    options={[
                        { value: "fuelio", label: "Fuelio CSV" },
                        { value: "drivvo", label: "Drivvo CSV" },
                        { value: "generic", label: t("genericCsv") },
                    ]}
                />
                <VehicleSelectField vehicles={vehicles} value={vehicleId} onChange={(value) => { setVehicleId(value); setPreview(null); }} />
                <Button label={preview ? t("chooseAnotherCsv") : t("chooseCsv")} icon="document-attach-outline" variant="secondary" onPress={() => void chooseFile()} />
            </Card>

            {preview ? (
                <>
                    <SectionHeader title={t("importPreview")} />
                    <Card style={styles.summary}>
                        <Row icon="document-text-outline" title={preview.fileName} subtitle={t("columnsDetected", { count: preview.headers.length })} />
                        <View style={styles.metrics}>
                            <Metric label={t("ready")} value={newExpenses.length} tone={colors.success} />
                            <Metric label={t("duplicates")} value={duplicates} tone={colors.warning} />
                            <Metric label={t("rejected")} value={preview.rejected.length} tone={colors.danger} />
                        </View>
                    </Card>
                    <Card style={styles.list}>
                        {newExpenses.slice(0, 12).map((entry, index) => (
                            <View key={`${entry.fingerprint}-${index}`}>
                                <Row
                                    icon={entry.draft.category === "fuel" ? "water-outline" : entry.draft.category === "charging" ? "flash-outline" : "receipt-outline"}
                                    title={`${entry.draft.date} · ${entry.draft.title}`}
                                    subtitle={`${entry.draft.amount} · ${entry.draft.place || entry.draft.category}`}
                                />
                                {index < Math.min(newExpenses.length, 12) - 1 ? <View style={styles.divider} /> : null}
                            </View>
                        ))}
                        {newExpenses.length > 12 ? <Text style={styles.moreRows}>{t("moreValidRows", { count: newExpenses.length - 12 })}</Text> : null}
                    </Card>
                    {preview.rejected.length ? (
                        <Card style={styles.rejected}>
                            <Text style={styles.rejectedTitle}>{t("rowsNeedAttention")}</Text>
                            {preview.rejected.slice(0, 8).map((entry) => <Text key={entry.rowNumber} style={styles.rejectedText}>{t("rowError", { row: entry.rowNumber, message: localizedImportReason(entry.reason, t) })}</Text>)}
                        </Card>
                    ) : null}
                    <Button label={t("importRecords", { count: newExpenses.length })} icon="download-outline" onPress={() => void runImport()} loading={busy} disabled={!newExpenses.length || !canWrite} />
                </>
            ) : (
                <EmptyState icon="cloud-upload-outline" title={t("recordsStayLocalFirst")} body={t("importerLocalFirstBody")} />
            )}
        </Screen>
    );
}

function localizedImportReason(reason: string, t: (key: TranslationKey) => string) {
    const key = IMPORT_REASON_KEYS[reason];
    return key ? t(key) : reason;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
    return <View style={styles.metric}><Text style={[styles.metricValue, { color: tone }]}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
    form: { gap: spacing.lg },
    body: { ...typography.body, color: colors.inkMuted },
    summary: { gap: spacing.md },
    metrics: { flexDirection: "row", gap: spacing.sm },
    metric: { flex: 1, alignItems: "center", padding: spacing.sm, borderRadius: 14, backgroundColor: colors.canvas },
    metricValue: { ...typography.heading },
    metricLabel: { ...typography.caption, color: colors.inkMuted },
    list: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
    moreRows: { ...typography.caption, color: colors.inkMuted, textAlign: "center", padding: spacing.md },
    rejected: { gap: spacing.xs, backgroundColor: colors.dangerSoft },
    rejectedTitle: { ...typography.bodyStrong, color: colors.danger },
    rejectedText: { ...typography.caption, color: colors.ink },
});
