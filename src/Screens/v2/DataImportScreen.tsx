import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
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

type Preview = ReturnType<typeof mapCsvExpenses> & { fileName: string; headers: string[] };

export default function DataImportScreen() {
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
            Alert.alert("CSV import", "Choose the vehicle that these records belong to first.");
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
            if (csv.headers.length < 2 || !csv.rows.length) throw new Error("The file does not contain a header and data rows.");
            const mapped = mapCsvExpenses({ csv, source, userId: dataOwnerId, vehicleId, batchId: uuid() });
            setPreview({ ...mapped, fileName: asset.name, headers: csv.headers });
        } catch (error) {
            Alert.alert("CSV import", (error as Error).message);
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
                    errors.push(`Row ${entry.rowNumber}: ${(error as Error).message}`);
                }
            }
            Alert.alert(
                "Import complete",
                `${imported} records imported${duplicates ? ` · ${duplicates} duplicates skipped` : ""}${preview.rejected.length ? ` · ${preview.rejected.length} invalid rows skipped` : ""}${errors.length ? ` · ${errors.length} rows failed` : ""}.`
            );
            if (!errors.length) setPreview(null);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Screen>
            <SectionHeader title="Import expense history" />
            <Card style={styles.form}>
                <Text style={styles.body}>Move existing history from Fuelio, Drivvo, or a spreadsheet. Nothing is written until you review the preview.</Text>
                <SelectField
                    label="File format"
                    value={source}
                    onChange={(value) => { setSource(value); setPreview(null); }}
                    options={[
                        { value: "fuelio", label: "Fuelio CSV" },
                        { value: "drivvo", label: "Drivvo CSV" },
                        { value: "generic", label: "Generic spreadsheet CSV" },
                    ]}
                />
                <VehicleSelectField vehicles={vehicles} value={vehicleId} onChange={(value) => { setVehicleId(value); setPreview(null); }} />
                <Button label={preview ? "Choose another CSV" : "Choose CSV"} icon="document-attach-outline" variant="secondary" onPress={() => void chooseFile()} />
            </Card>

            {preview ? (
                <>
                    <SectionHeader title="Import preview" />
                    <Card style={styles.summary}>
                        <Row icon="document-text-outline" title={preview.fileName} subtitle={`${preview.headers.length} columns detected`} />
                        <View style={styles.metrics}>
                            <Metric label="Ready" value={newExpenses.length} tone={colors.success} />
                            <Metric label="Duplicates" value={duplicates} tone={colors.warning} />
                            <Metric label="Rejected" value={preview.rejected.length} tone={colors.danger} />
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
                        {newExpenses.length > 12 ? <Text style={styles.moreRows}>And {newExpenses.length - 12} more valid rows…</Text> : null}
                    </Card>
                    {preview.rejected.length ? (
                        <Card style={styles.rejected}>
                            <Text style={styles.rejectedTitle}>Rows needing attention</Text>
                            {preview.rejected.slice(0, 8).map((entry) => <Text key={entry.rowNumber} style={styles.rejectedText}>Row {entry.rowNumber}: {entry.reason}</Text>)}
                        </Card>
                    ) : null}
                    <Button label={`Import ${newExpenses.length} records`} icon="download-outline" onPress={() => void runImport()} loading={busy} disabled={!newExpenses.length || !canWrite} />
                </>
            ) : (
                <EmptyState icon="cloud-upload-outline" title="Your records stay local-first" body="The importer validates dates, amounts and fuel or charging quantities, then queues the accepted rows for PowerSync." />
            )}
        </Screen>
    );
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
