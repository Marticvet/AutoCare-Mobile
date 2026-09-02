import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Card, FormField, Row, Screen, SectionHeader, SelectField } from "../../components/ui";
import { useChecklistRuns, useChecklistTemplates, useGarageMemberships } from "../../data/liveQueries";
import { ensureDefaultChecklist, saveChecklistTemplate, startChecklistRun } from "../../data/repository";
import { RootStackParamList } from "../../navigation/types";
import { useAuth } from "../../providers/AuthProvider";
import { useGarage } from "../../providers/GarageProvider";
import { colors, spacing, typography } from "../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Checklists">;

export default function ChecklistsScreen({ navigation }: Props) {
    const { vehicles, selectedVehicleId, dataOwnerId, activeGarageId, canWrite } = useGarage();
    const { profile, userId } = useAuth();
    const [vehicleId, setVehicleId] = useState(selectedVehicleId || vehicles[0]?.id || "");
    const { data: templates } = useChecklistTemplates(dataOwnerId);
    const { data: runs } = useChecklistRuns(dataOwnerId, vehicleId);
    const { data: memberships } = useGarageMemberships(activeGarageId);
    const [templateId, setTemplateId] = useState("");
    const [customName, setCustomName] = useState("");
    const [customItems, setCustomItems] = useState("");
    const [assignedUserId, setAssignedUserId] = useState(userId || dataOwnerId);
    const [busy, setBusy] = useState(false);
    const driverOptions = useMemo(() => {
        const options = [
            {
                value: dataOwnerId,
                label: dataOwnerId === userId ? (profile?.full_name || profile?.email || "You") : "Garage owner",
            },
            ...memberships
                .filter((membership) => membership.status === "active" && Boolean(membership.user_id))
                .map((membership) => ({
                    value: membership.user_id ?? "",
                    label: membership.user_id === userId
                        ? (profile?.full_name || membership.display_name || membership.email || "You")
                        : (membership.display_name || membership.email || "Garage member"),
                })),
        ];
        return options.filter((option, index) => option.value && options.findIndex((candidate) => candidate.value === option.value) === index);
    }, [dataOwnerId, memberships, profile?.email, profile?.full_name, userId]);

    useEffect(() => {
        if (!dataOwnerId || !canWrite) return;
        void ensureDefaultChecklist(dataOwnerId).catch(() => undefined);
    }, [canWrite, dataOwnerId]);
    useEffect(() => {
        if (!templateId && templates[0]?.id) setTemplateId(templates[0].id);
    }, [templateId, templates]);
    useEffect(() => {
        if (!driverOptions.some((option) => option.value === assignedUserId)) {
            setAssignedUserId(driverOptions[0]?.value ?? "");
        }
    }, [assignedUserId, driverOptions]);

    const start = async () => {
        if (!vehicleId || !templateId || !canWrite) return;
        setBusy(true);
        try {
            const driverName = driverOptions.find((option) => option.value === assignedUserId)?.label ?? profile?.full_name ?? "";
            const runId = await startChecklistRun(dataOwnerId, vehicleId, templateId, assignedUserId, driverName);
            navigation.navigate("ChecklistRun", { runId });
        } catch (error) {
            Alert.alert("Checklist", (error as Error).message);
        } finally {
            setBusy(false);
        }
    };
    const addTemplate = async () => {
        const items = customItems.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
        if (!customName.trim() || !items.length) {
            Alert.alert("Custom checklist", "Enter a name and at least one checklist item, one per line.");
            return;
        }
        setBusy(true);
        try {
            const id = await saveChecklistTemplate({ userId: dataOwnerId, name: customName, description: "Custom fleet checklist", vehicleType: "", items: items.map((label, sortOrder) => ({ label, sortOrder, required: true })) });
            setTemplateId(id);
            setCustomName("");
            setCustomItems("");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Screen>
            <SectionHeader title="Fleet checklists" />
            <Card style={styles.intro}>
                <Text style={styles.title}>Consistent inspections, even offline</Text>
                <Text style={styles.body}>Run a pre-trip check, record damage, and collect the driver’s sign-off. Completed runs synchronize with the garage.</Text>
            </Card>
            <Card style={styles.form}>
                <SelectField label="Vehicle" value={vehicleId} onChange={setVehicleId} options={vehicles.map((vehicle) => ({ value: vehicle.id ?? "", label: [vehicle.vehicle_brand, vehicle.vehicle_model, vehicle.vehicle_license_plate].filter(Boolean).join(" · ") }))} />
                <SelectField label="Checklist" value={templateId} onChange={setTemplateId} options={templates.map((template) => ({ value: template.id ?? "", label: template.name ?? "Checklist" }))} />
                <SelectField label="Assigned driver" value={assignedUserId} onChange={setAssignedUserId} options={driverOptions} />
                <Button label="Start inspection" icon="clipboard-outline" onPress={() => void start()} loading={busy} disabled={!vehicleId || !templateId || !canWrite} />
            </Card>
            <SectionHeader title="Custom template" />
            <Card style={styles.form}>
                <FormField label="Template name" value={customName} onChangeText={setCustomName} />
                <FormField label="Checklist items" value={customItems} onChangeText={setCustomItems} multiline placeholder="Tyres and damage\nLights and indicators\nSafety equipment" hint="Enter one item per line." />
                <Button label="Save template" icon="add" variant="secondary" onPress={() => void addTemplate()} loading={busy} disabled={!canWrite} />
            </Card>
            {runs.length ? (
                <>
                    <SectionHeader title="Inspection history" />
                    <Card style={styles.list}>
                        {runs.map((run, index) => (
                            <View key={run.id ?? index}>
                                <Row
                                    icon={run.status === "passed" ? "checkmark-circle-outline" : run.status === "attention_required" ? "warning-outline" : "time-outline"}
                                    title={run.status === "passed" ? "Passed" : run.status === "attention_required" ? "Attention required" : "In progress"}
                                    subtitle={`${new Date(run.started_at ?? Date.now()).toLocaleString()}${run.driver_name ? ` · ${run.driver_name}` : ""}`}
                                    tone={run.status === "passed" ? "green" : run.status === "attention_required" ? "red" : "amber"}
                                    onPress={() => run.id && navigation.navigate("ChecklistRun", { runId: run.id })}
                                />
                                {index < runs.length - 1 ? <View style={styles.divider} /> : null}
                            </View>
                        ))}
                    </Card>
                </>
            ) : null}
        </Screen>
    );
}

const styles = StyleSheet.create({
    intro: { gap: spacing.sm },
    title: { ...typography.heading, color: colors.ink },
    body: { ...typography.body, color: colors.inkMuted },
    form: { gap: spacing.lg },
    list: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
});
