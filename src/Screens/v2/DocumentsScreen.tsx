import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Card, EmptyState, PageHeader, Row, Screen } from "../../components/ui";
import { VehicleSelectField } from "../../components/VehicleSelectField";
import { useDocuments } from "../../data/liveQueries";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useConnectivity } from "../../providers/ConnectivityProvider";
import { useGarage } from "../../providers/GarageProvider";
import { openDocument } from "../../services/documentStorage";
import { colors, spacing, typography } from "../../theme/tokens";
import { isoDate } from "../../utils/tracking";
import { useSubscription } from "../../billing/SubscriptionProvider";

export default function DocumentsScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { isOnline } = useConnectivity();
    const { t } = usePreferences();
    const { vehicles, selectedVehicleId, dataOwnerId } = useGarage();
    const [scope, setScope] = useState(selectedVehicleId || "all");
    const { data: documents } = useDocuments(dataOwnerId, scope === "all" ? undefined : scope);
    const { canCreateDocument } = useSubscription();

    const addDocument = () => {
        if (!canCreateDocument) {
            navigation.navigate("Paywall", { source: "document" });
            return;
        }
        navigation.navigate("DocumentForm", { vehicleId: scope === "all" ? selectedVehicleId : scope });
    };

    const open = async (document: (typeof documents)[number]) => {
        try {
            if (!(await openDocument(document, isOnline))) Alert.alert(t("documents"), t("documentUnavailableOffline"));
        } catch (error) {
            Alert.alert(t("documents"), (error as Error).message);
        }
    };

    return (
        <Screen>
            <PageHeader title={t("documents")} action={t("addDocument")} onAction={addDocument} />
            <VehicleSelectField
                vehicles={vehicles}
                value={scope}
                onChange={setScope}
                includeAll
            />
            {documents.length ? (
                <View style={styles.cards}>
                    {documents.map((document) => {
                        const expired = Boolean(document.expiration_date && document.expiration_date < isoDate());
                        const vehicle = vehicles.find((entry) => entry.id === document.vehicle_id);
                        return (
                            <Card key={document.id ?? ""} style={styles.documentCard}>
                                <Row
                                    icon="document-text-outline"
                                    tone={expired ? "red" : "blue"}
                                    title={document.title ?? document.file_name ?? t("documents")}
                                    subtitle={`${vehicle?.vehicle_license_plate || t("vehicle")} · ${document.expiration_date ? `${t("expirationDate")}: ${document.expiration_date}` : document.file_name || ""}`}
                                    onPress={() => void open(document)}
                                />
                                <View style={styles.actions}>
                                    <Text style={[styles.status, expired && styles.statusExpired]}>{expired ? t("overdue") : document.remote_url ? t("online") : t("offline")}</Text>
                                    <Button label={t("edit")} compact variant="ghost" onPress={() => navigation.navigate("DocumentForm", { documentId: document.id ?? undefined })} />
                                </View>
                            </Card>
                        );
                    })}
                </View>
            ) : (
                <EmptyState icon="documents-outline" title={t("noDocuments")} body={t("noDocumentsBody")} action={t("addDocument")} onAction={addDocument} />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    cards: { gap: spacing.md },
    documentCard: { gap: spacing.sm },
    actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
    status: { ...typography.caption, color: colors.inkMuted },
    statusExpired: { color: colors.danger, fontWeight: "700" },
});
