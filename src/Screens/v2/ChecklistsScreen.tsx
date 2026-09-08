import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card, FormField, Row, Screen, SectionHeader, SelectField } from "../../components/ui";
import { useChecklistRuns, useChecklistTemplates, useGarageMemberships } from "../../data/liveQueries";
import { ChecklistRunRecord, ChecklistTemplateRecord } from "../../data/models";
import { deleteChecklistRun, deleteChecklistTemplate, ensureDefaultChecklist, fetchChecklistRunsFromServer, fetchChecklistTemplatesFromServer, saveChecklistTemplate, startChecklistRun } from "../../data/repository";
import { RootStackParamList } from "../../navigation/types";
import { useAuth } from "../../providers/AuthProvider";
import { useGarage } from "../../providers/GarageProvider";
import { colors, spacing, typography } from "../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Checklists">;

export default function ChecklistsScreen({ navigation }: Props) {
    const { vehicles, selectedVehicleId, dataOwnerId, activeGarageId, canWrite } = useGarage();
    const { profile, userId } = useAuth();
    const [vehicleId, setVehicleId] = useState(selectedVehicleId || vehicles[0]?.id || "");
    const { data: localTemplates, loading: templatesLoading, error: templatesError } = useChecklistTemplates(dataOwnerId);
    const { data: localRuns, loading: runsLoading } = useChecklistRuns(dataOwnerId, vehicleId);
    const { data: memberships } = useGarageMemberships(activeGarageId);
    const [templateId, setTemplateId] = useState("");
    const [customName, setCustomName] = useState("");
    const [customItems, setCustomItems] = useState("");
    const [assignedUserId, setAssignedUserId] = useState(userId || dataOwnerId);
    const [busy, setBusy] = useState(false);
    const [starting, setStarting] = useState(false);
    const [showStartingSpinner, setShowStartingSpinner] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deletingRunId, setDeletingRunId] = useState<string | null>(null);
    const [initializing, setInitializing] = useState(false);
    const [initializationError, setInitializationError] = useState<string | null>(null);
    const [hiddenTemplateIds, setHiddenTemplateIds] = useState<string[]>([]);
    const [optimisticTemplates, setOptimisticTemplates] = useState<ChecklistTemplateRecord[]>([]);
    const [hiddenRunIds, setHiddenRunIds] = useState<string[]>([]);
    const serverScope = `${dataOwnerId}:${vehicleId}`;
    const [serverResult, setServerResult] = useState<{
        scope: string;
        templates: ChecklistTemplateRecord[];
        runs: ChecklistRunRecord[];
        loading: boolean;
        error: boolean;
    }>({ scope: "", templates: [], runs: [], loading: false, error: false });

    useEffect(() => {
        if (!vehicles.length) return;
        if (vehicles.some((vehicle) => vehicle.id === vehicleId)) return;

        const nextVehicleId = vehicles.some((vehicle) => vehicle.id === selectedVehicleId)
            ? selectedVehicleId
            : vehicles[0]?.id ?? "";
        setVehicleId(nextVehicleId);
    }, [selectedVehicleId, vehicleId, vehicles]);

    useEffect(() => {
        setHiddenTemplateIds([]);
        setOptimisticTemplates([]);
        setHiddenRunIds([]);
    }, [dataOwnerId]);

    useFocusEffect(useCallback(() => {
        let mounted = true;
        if (!dataOwnerId || templatesLoading || runsLoading) {
            return () => { mounted = false; };
        }

        setServerResult((current) => ({
            scope: serverScope,
            templates: current.scope === serverScope ? current.templates : [],
            runs: current.scope === serverScope ? current.runs : [],
            loading: true,
            error: false,
        }));
        void Promise.allSettled([
            fetchChecklistTemplatesFromServer(dataOwnerId),
            fetchChecklistRunsFromServer(dataOwnerId, vehicleId || undefined),
        ]).then(([templatesResult, runsResult]) => {
            if (!mounted) return;
            setServerResult({
                scope: serverScope,
                templates: templatesResult.status === "fulfilled" ? templatesResult.value : [],
                runs: runsResult.status === "fulfilled" ? runsResult.value : [],
                loading: false,
                error: templatesResult.status === "rejected" || runsResult.status === "rejected",
            });
        });

        return () => { mounted = false; };
    }, [dataOwnerId, runsLoading, serverScope, templatesLoading, vehicleId]));

    const scopedServerResult = serverResult.scope === serverScope ? serverResult : null;
    const templates = useMemo(() => {
        const merged = new Map<string, ChecklistTemplateRecord>();
        scopedServerResult?.templates.forEach((template) => {
            if (template.id && !hiddenTemplateIds.includes(template.id)) merged.set(template.id, template);
        });
        localTemplates.forEach((template) => {
            if (template.id && !hiddenTemplateIds.includes(template.id)) merged.set(template.id, template);
        });
        optimisticTemplates.forEach((template) => {
            if (template.id && !hiddenTemplateIds.includes(template.id)) merged.set(template.id, template);
        });
        return [...merged.values()].sort((left, right) => {
            const defaultOrder = Number(right.is_default ?? 0) - Number(left.is_default ?? 0);
            return defaultOrder || String(left.name ?? "").localeCompare(String(right.name ?? ""));
        });
    }, [hiddenTemplateIds, localTemplates, optimisticTemplates, scopedServerResult?.templates]);
    const runs = useMemo(() => {
        const merged = new Map<string, ChecklistRunRecord>();
        scopedServerResult?.runs.forEach((run) => {
            if (run.id && !hiddenRunIds.includes(run.id)) merged.set(run.id, run);
        });
        localRuns.forEach((run) => {
            if (run.id && !hiddenRunIds.includes(run.id)) merged.set(run.id, run);
        });
        return [...merged.values()].sort((left, right) =>
            String(right.started_at ?? "").localeCompare(String(left.started_at ?? ""))
        );
    }, [hiddenRunIds, localRuns, scopedServerResult?.runs]);
    const selectedTemplate = templates.find((template) => template.id === templateId) ?? null;
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

    const prepareDefaultChecklist = async () => {
        if (!dataOwnerId || !canWrite) return;
        setInitializing(true);
        setInitializationError(null);
        try {
            const id = await ensureDefaultChecklist(dataOwnerId);
            const now = new Date().toISOString();
            setHiddenTemplateIds((current) => current.filter((templateId) => templateId !== id));
            setOptimisticTemplates((current) => [
                ...current.filter((template) => template.id !== id),
                {
                    id,
                    user_id: dataOwnerId,
                    name: "Pre-trip inspection",
                    description: "A quick safety check before driving.",
                    vehicle_type: null,
                    is_default: 1,
                    active: 1,
                    created_at: now,
                    updated_at: now,
                },
            ]);
            setTemplateId(id);
        } catch (error) {
            setInitializationError((error as Error).message || "The starter checklist could not be created.");
        } finally {
            setInitializing(false);
        }
    };

    useEffect(() => {
        if (selectedTemplate) return;
        setTemplateId(templates[0]?.id ?? "");
    }, [selectedTemplate, templates]);
    useEffect(() => {
        if (!driverOptions.some((option) => option.value === assignedUserId)) {
            setAssignedUserId(driverOptions[0]?.value ?? "");
        }
    }, [assignedUserId, driverOptions]);

    const start = async () => {
        if (!vehicleId || !selectedTemplate?.id || !canWrite || starting) return;
        setStarting(true);
        const spinnerTimer = setTimeout(() => setShowStartingSpinner(true), 350);
        try {
            const driverName = driverOptions.find((option) => option.value === assignedUserId)?.label ?? profile?.full_name ?? "";
            const created = await startChecklistRun(dataOwnerId, vehicleId, selectedTemplate.id, assignedUserId, driverName);
            navigation.navigate("ChecklistRun", {
                runId: created.runId,
                initialRun: created.run,
                initialItems: created.items,
            });
        } catch (error) {
            Alert.alert("Checklist", (error as Error).message);
        } finally {
            clearTimeout(spinnerTimer);
            setShowStartingSpinner(false);
            setStarting(false);
        }
    };
    const addTemplate = async () => {
        const items = customItems.replace(/\\n/g, "\n").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
        if (!customName.trim() || !items.length) {
            Alert.alert("Custom checklist", "Enter a name and at least one checklist item, one per line.");
            return;
        }
        setBusy(true);
        try {
            const name = customName.trim();
            const id = await saveChecklistTemplate({ userId: dataOwnerId, name, description: "Custom fleet checklist", vehicleType: "", items: items.map((label, sortOrder) => ({ label, sortOrder, required: true })) });
            const now = new Date().toISOString();
            setOptimisticTemplates((current) => [
                ...current.filter((template) => template.id !== id),
                {
                    id,
                    user_id: dataOwnerId,
                    name,
                    description: "Custom fleet checklist",
                    vehicle_type: null,
                    is_default: 0,
                    active: 1,
                    created_at: now,
                    updated_at: now,
                },
            ]);
            setTemplateId(id);
            setCustomName("");
            setCustomItems("");
            Alert.alert("Checklist template saved successfully");
        } catch (error) {
            Alert.alert("Custom checklist", (error as Error).message);
        } finally {
            setBusy(false);
        }
    };
    const removeTemplate = () => {
        if (!selectedTemplate?.id || !canWrite) return;

        Alert.alert(
            "Delete checklist template?",
            `“${selectedTemplate.name || "Checklist"}” will no longer be available for new inspections. Existing inspection history will be kept.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => void (async () => {
                        setDeleting(true);
                        try {
                            await deleteChecklistTemplate(selectedTemplate.id!, dataOwnerId);
                            setHiddenTemplateIds((current) => [...new Set([...current, selectedTemplate.id!])]);
                            setOptimisticTemplates((current) => current.filter((template) => template.id !== selectedTemplate.id));
                            setTemplateId(templates.find((template) => template.id !== selectedTemplate.id)?.id ?? "");
                            Alert.alert("Checklist template deleted", "Existing inspection history was kept.");
                        } catch (error) {
                            Alert.alert("Delete checklist", (error as Error).message);
                        } finally {
                            setDeleting(false);
                        }
                    })(),
                },
            ]
        );
    };
    const removeRun = (run: ChecklistRunRecord) => {
        if (!run.id || !canWrite || deletingRunId) return;

        Alert.alert(
            "Delete inspection?",
            "This permanently deletes this inspection and all of its recorded checklist results.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => void (async () => {
                        setDeletingRunId(run.id!);
                        try {
                            await deleteChecklistRun(run.id!, dataOwnerId);
                            setHiddenRunIds((current) => [...new Set([...current, run.id!])]);
                        } catch (error) {
                            Alert.alert("Delete inspection", (error as Error).message);
                        } finally {
                            setDeletingRunId(null);
                        }
                    })(),
                },
            ]
        );
    };

    const templatesResolved = !templatesLoading
        && Boolean(scopedServerResult && !scopedServerResult.loading);

    return (
        <Screen>
            <SectionHeader title="Fleet checklists" />
            <Card style={styles.intro}>
                <Text style={styles.title}>Consistent inspections, even offline</Text>
                <Text style={styles.body}>Run a pre-trip check, record damage, and collect the driver’s sign-off. Completed runs synchronize with the garage.</Text>
            </Card>
            <Card style={styles.form}>
                {!templates.length && templatesResolved ? (
                    <View style={styles.emptyTemplates}>
                        <Text style={styles.title}>No checklist is available</Text>
                        <Text style={styles.body}>{initializationError || templatesError?.message || (scopedServerResult?.error ? "The checklist service could not be refreshed. Check your connection and retry." : "Create the standard pre-trip checklist, or add your own template below.")}</Text>
                        <Button label="Create starter checklist" icon="add-circle-outline" variant="secondary" onPress={() => void prepareDefaultChecklist()} loading={initializing} disabled={!canWrite} />
                    </View>
                ) : null}
                <SelectField label="Vehicle" value={vehicleId} onChange={setVehicleId} options={vehicles.map((vehicle) => ({ value: vehicle.id ?? "", label: [vehicle.vehicle_brand, vehicle.vehicle_model, vehicle.vehicle_license_plate].filter(Boolean).join(" · ") }))} />
                <SelectField label="Checklist" value={templateId} onChange={setTemplateId} options={templates.map((template) => ({ value: template.id ?? "", label: template.name ?? "Checklist" }))} />
                <SelectField label="Assigned driver" value={assignedUserId} onChange={setAssignedUserId} options={driverOptions} />
                <Button label="Start inspection" icon="clipboard-outline" onPress={() => void start()} loading={showStartingSpinner} disabled={!vehicleId || !selectedTemplate || !canWrite || starting} />
                {selectedTemplate ? <Button label="Delete selected template" icon="trash-outline" variant="danger" onPress={removeTemplate} loading={deleting} disabled={!canWrite || busy || starting} /> : null}
            </Card>
            <SectionHeader title="Custom template" />
            <Card style={styles.form}>
                <FormField label="Template name" value={customName} onChangeText={setCustomName} />
                <FormField
                    label="Checklist items"
                    value={customItems}
                    onChangeText={setCustomItems}
                    multiline
                    placeholder={"Example:\nTyres and visible damage\nLights and indicators\nSafety equipment"}
                    hint="Enter one item per line."
                />
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
                                    trailing={run.id && canWrite ? (
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel="Delete inspection"
                                            disabled={Boolean(deletingRunId)}
                                            hitSlop={10}
                                            onPress={(event) => {
                                                event.stopPropagation();
                                                removeRun(run);
                                            }}
                                            style={({ pressed }) => [styles.deleteRunButton, pressed && styles.deleteRunButtonPressed]}
                                        >
                                            <Ionicons name="trash-outline" color={colors.danger} size={20} />
                                        </Pressable>
                                    ) : undefined}
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
    emptyTemplates: { gap: spacing.sm, paddingBottom: spacing.sm },
    list: { paddingVertical: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
    deleteRunButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.dangerSoft },
    deleteRunButtonPressed: { opacity: 0.7 },
});
