import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { Button, Card, ChoiceChips, DateField, FormField, LoadingState, Screen, SectionHeader } from "../../components/ui";
import { VehicleSelectField } from "../../components/VehicleSelectField";
import { useDocuments } from "../../data/liveQueries";
import { DocumentDraft } from "../../data/models";
import { deleteDocument, saveDocument } from "../../data/repository";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { uuid } from "../../powersync/uuid";
import { useConnectivity } from "../../providers/ConnectivityProvider";
import { useGarage } from "../../providers/GarageProvider";
import { captureDocument, deleteRemotePath, deleteStoredDocument, pickDocument, syncPendingDocuments } from "../../services/documentStorage";
import { colors, spacing, typography } from "../../theme/tokens";
import { isIsoDate } from "../../utils/tracking";
import { useSubscription } from "../../billing/SubscriptionProvider";

type Props = NativeStackScreenProps<RootStackParamList, "DocumentForm">;

export default function DocumentFormScreen({ route, navigation }: Props) {
    const existingId = route.params?.documentId;
    const documentId = useRef(existingId ?? uuid()).current;
    const { isOnline } = useConnectivity();
    const { vehicles, selectedVehicleId, dataOwnerId, canWrite } = useGarage();
    const { t } = usePreferences();
    const { canCreateDocument } = useSubscription();
    const { data: documents, loading } = useDocuments(dataOwnerId);
    const source = documents.find((document) => document.id === existingId);
    const [draft, setDraft] = useState<DocumentDraft>({
        id: documentId,
        userId: dataOwnerId,
        vehicleId: route.params?.vehicleId || selectedVehicleId,
        title: "",
        category: "registration",
        fileName: "",
        mimeType: "",
        fileSize: 0,
        storagePath: "",
        remoteUrl: "",
        expirationDate: "",
        notes: "",
        relatedExpenseId: route.params?.relatedExpenseId,
        relatedExpenseType: route.params?.relatedExpenseType,
    });
    const [hasLocalFile, setHasLocalFile] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!source) return;
        setDraft({
            id: source.id ?? undefined,
            userId: dataOwnerId,
            vehicleId: source.vehicle_id ?? "",
            title: source.title ?? "",
            category: source.category ?? "other",
            fileName: source.file_name ?? "",
            mimeType: source.mime_type ?? "",
            fileSize: source.file_size ?? 0,
            storagePath: source.storage_path ?? "",
            remoteUrl: source.remote_url ?? "",
            expirationDate: source.expiration_date ?? "",
            notes: source.notes ?? "",
            relatedExpenseId: source.related_expense_id ?? undefined,
            relatedExpenseType: source.related_expense_type ?? undefined,
        });
    }, [dataOwnerId, source]);

    const update = <K extends keyof DocumentDraft>(key: K, value: DocumentDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
    const requireNewDocumentAccess = () => {
        if (existingId || canCreateDocument) return true;
        navigation.navigate("Paywall", { source: "document" });
        return false;
    };
    const requireFileUploadAccess = () => {
        if (canCreateDocument) return true;
        navigation.navigate("Paywall", { source: "document" });
        return false;
    };
    const choose = async () => {
        if (!requireFileUploadAccess()) return;
        try {
            const file = await pickDocument(documentId);
            if (!file) return;
            setHasLocalFile(true);
            setDraft((current) => ({
                ...current,
                fileName: file.fileName,
                mimeType: file.mimeType,
                fileSize: file.fileSize,
                storagePath: `${dataOwnerId}/${current.vehicleId}/${documentId}-${file.fileName}`,
                remoteUrl: "",
                title: current.title || file.fileName.replace(/\.[^.]+$/, ""),
            }));
        } catch (error) {
            Alert.alert(t("chooseFile"), (error as Error).message);
        }
    };
    const scan = async () => {
        if (!requireFileUploadAccess()) return;
        try {
            const file = await captureDocument(documentId);
            if (!file) return;
            setHasLocalFile(true);
            setDraft((current) => ({
                ...current,
                fileName: file.fileName,
                mimeType: file.mimeType,
                fileSize: file.fileSize,
                storagePath: `${dataOwnerId}/${current.vehicleId}/${documentId}-${file.fileName}`,
                remoteUrl: "",
                title: current.title || file.fileName.replace(/\.[^.]+$/, ""),
            }));
        } catch (error) {
            Alert.alert(t("scanDocument"), (error as Error).message);
        }
    };
    const submit = async () => {
        if (!canWrite) {
            Alert.alert(t("documents"), "Your garage role is view-only.");
            return;
        }
        if (!requireNewDocumentAccess()) return;
        if (!draft.title.trim() || !draft.vehicleId || (!draft.fileName && !existingId) || (draft.expirationDate && !isIsoDate(draft.expirationDate))) {
            Alert.alert(t("documents"), draft.expirationDate && !isIsoDate(draft.expirationDate) ? t("invalidDate") : t("requiredFields"));
            return;
        }
        setBusy(true);
        try {
            const finalDraft = {
                ...draft,
                storagePath: draft.storagePath || (draft.fileName ? `${dataOwnerId}/${draft.vehicleId}/${documentId}-${draft.fileName}` : ""),
            };
            await saveDocument(finalDraft);
            if (source?.storage_path && source.storage_path !== finalDraft.storagePath) {
                await deleteRemotePath(source.storage_path, isOnline);
            }
            if (isOnline && (hasLocalFile || !existingId)) void syncPendingDocuments(dataOwnerId);
            Alert.alert(t("documentSaved"));
            navigation.goBack();
        } catch (error) {
            Alert.alert(t("documents"), (error as Error).message);
        } finally {
            setBusy(false);
        }
    };
    const confirmDelete = () => existingId && source && Alert.alert(t("delete"), undefined, [
        { text: t("cancel"), style: "cancel" },
        {
            text: t("delete"), style: "destructive", onPress: () => void (async () => {
                await deleteStoredDocument(source, isOnline);
                await deleteDocument(existingId, dataOwnerId);
                navigation.goBack();
            })(),
        },
    ]);

    if (existingId && loading && !source) return <Screen><LoadingState /></Screen>;
    return (
        <Screen>
            <SectionHeader title={existingId ? t("editDocument") : t("addDocument")} />
            <Card style={styles.form}>
                <VehicleSelectField vehicles={vehicles} value={draft.vehicleId} onChange={(value) => update("vehicleId", value)} />
                <FormField label={t("documentTitle")} value={draft.title} onChangeText={(value) => update("title", value)} required />
                <Text style={styles.label}>{t("documentType")}</Text>
                <ChoiceChips
                    value={draft.category}
                    onChange={(value) => update("category", value)}
                    options={[
                        { value: "registration", label: t("registration") },
                        { value: "insurance", label: t("insurance") },
                        { value: "inspection", label: t("inspection") },
                        { value: "receipt", label: t("receipt") },
                        { value: "warranty", label: t("warranty") },
                        { value: "other", label: t("other") },
                    ]}
                />
                <DateField label={t("expirationDate")} value={draft.expirationDate} onChange={(value) => update("expirationDate", value)} hint={t("optional")} />
                <FormField label={t("notes")} value={draft.notes} onChangeText={(value) => update("notes", value)} multiline />
            </Card>
            <Button label={draft.fileName ? `${t("replaceFile")}: ${draft.fileName}` : t("chooseFile")} icon="attach-outline" variant="secondary" onPress={choose} />
            <Button label={t("scanDocument")} icon="camera-outline" variant="secondary" onPress={scan} />
            <Button label={t("save")} icon="checkmark" onPress={submit} loading={busy} />
            {existingId ? <Button label={t("delete")} icon="trash-outline" variant="danger" onPress={confirmDelete} /> : null}
        </Screen>
    );
}

const styles = StyleSheet.create({
    form: { gap: spacing.lg },
    label: { ...typography.label, color: colors.ink, marginBottom: -spacing.sm },
});
