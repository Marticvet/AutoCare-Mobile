import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card, FormField, Row, Screen, SectionHeader, SelectField } from "../../components/ui";
import { useChecklistRuns, useChecklistTemplates, useGarageMemberships } from "../../data/liveQueries";
import { ChecklistRunRecord, ChecklistTemplateRecord } from "../../data/models";
import { CUSTOM_CHECKLIST_DESCRIPTION, DEFAULT_CHECKLIST_DESCRIPTION, deleteChecklistRun, deleteChecklistTemplate, ensureDefaultChecklist, fetchChecklistRunsFromServer, fetchChecklistTemplatesFromServer, saveChecklistTemplate, startChecklistRun } from "../../data/repository";
import { RootStackParamList } from "../../navigation/types";
import { useAuth } from "../../providers/AuthProvider";
import { useGarage } from "../../providers/GarageProvider";
import { colors, spacing, typography } from "../../theme/tokens";
import { usePreferences } from "../../i18n/PreferencesProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Checklists">;

export default function ChecklistsScreen({ navigation }: Props) {
    const { t, locale } = usePreferences();
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
                label: dataOwnerId === userId ? (profile?.full_name || profile?.email || t("you")) : t("garageOwner"),
            },
            ...memberships
                .filter((membership) => membership.status === "active" && Boolean(membership.user_id))
                .map((membership) => ({
                    value: membership.user_id ?? "",
                    label: membership.user_id === userId
                        ? (profile?.full_name || membership.display_name || membership.email || t("you"))
                        : (membership.display_name || membership.email || t("garageMember")),
                })),
        ];
        return options.filter((option, index) => option.value && options.findIndex((candidate) => candidate.value === option.value) === index);
    }, [dataOwnerId, memberships, profile?.email, profile?.full_name, t, userId]);

    const localizedChecklistText = useCallback((value?: string | null) => {
        const known: Record<string, string> = {
            "Pre-trip inspection": t("preTripInspection"),
            [DEFAULT_CHECKLIST_DESCRIPTION]: t("preTripDescription"),
            "Tyres and visible damage": t("tyresAndDamage"),
            "Lights and indicators": t("lightsAndIndicators"),
            "Windows and mirrors": t("windowsAndMirrors"),
            "Safety equipment": t("safetyEquipment"),
            "Fluid leaks": t("fluidLeaks"),
            "Brakes and steering": t("brakesAndSteering"),
            "Seat belts and safety equipment": t("seatBeltsAndSafetyEquipment"),
            "Fuel or charge level": t("fuelOrChargeLevel"),
            "Documents present": t("documentsPresent"),
        };
        return value ? known[value] ?? value : t("checklist");
    }, [t]);

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
                    description: DEFAULT_CHECKLIST_DESCRIPTION,
                    vehicle_type: null,
                    is_default: 1,
                    active: 1,
                    created_at: now,
                    updated_at: now,
                },
            ]);
            setTemplateId(id);
        } catch (error) {
            setInitializationError((error as Error).message || t("starterChecklistCreateError"));
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
            const created = await startChecklistRun(dataOwnerId, vehicleId, selectedTemplate.id, assignedUserId, driverName, t("checklistStartNoItems"));
            navigation.navigate("ChecklistRun", {
                runId: created.runId,
                initialRun: created.run,
                initialItems: created.items,
            });
        } catch (error) {
            Alert.alert(t("checklist"), (error as Error).message);
        } finally {
            clearTimeout(spinnerTimer);
            setShowStartingSpinner(false);
            setStarting(false);
        }
    };
    const addTemplate = async () => {
        const items = customItems.replace(/\\n/g, "\n").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
        if (!customName.trim() || !items.length) {
            Alert.alert(t("customChecklist"), t("customChecklistValidation"));
            return;
        }
        setBusy(true);
        try {
            const name = customName.trim();
            const id = await saveChecklistTemplate({ userId: dataOwnerId, name, description: CUSTOM_CHECKLIST_DESCRIPTION, vehicleType: "", items: items.map((label, sortOrder) => ({ label, sortOrder, required: true })) });
            const now = new Date().toISOString();
            setOptimisticTemplates((current) => [
                ...current.filter((template) => template.id !== id),
                {
                    id,
                    user_id: dataOwnerId,
                    name,
                    description: CUSTOM_CHECKLIST_DESCRIPTION,
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
            Alert.alert(t("checklistTemplateSaved"));
        } catch (error) {
            Alert.alert(t("customChecklist"), (error as Error).message);
        } finally {
            setBusy(false);
        }
    };
    const removeTemplate = () => {
        if (!selectedTemplate?.id || !canWrite) return;

        Alert.alert(
            t("deleteChecklistQuestion", { name: localizedChecklistText(selectedTemplate.name) }),
            t("deleteChecklistBody"),
            [
                { text: t("cancel"), style: "cancel" },
                {
                    text: t("delete"),
                    style: "destructive",
                    onPress: () => void (async () => {
                        setDeleting(true);
                        try {
                            await deleteChecklistTemplate(selectedTemplate.id!, dataOwnerId);
                            setHiddenTemplateIds((current) => [...new Set([...current, selectedTemplate.id!])]);
                            setOptimisticTemplates((current) => current.filter((template) => template.id !== selectedTemplate.id));
                            setTemplateId(templates.find((template) => template.id !== selectedTemplate.id)?.id ?? "");
                            Alert.alert(t("checklistTemplateDeleted"), t("inspectionHistoryKept"));
                        } catch (error) {
                            Alert.alert(t("deleteChecklist"), (error as Error).message);
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
            t("deleteInspectionQuestion"),
            t("deleteInspectionBody"),
            [
                { text: t("cancel"), style: "cancel" },
                {
                    text: t("delete"),
                    style: "destructive",
                    onPress: () => void (async () => {
                        setDeletingRunId(run.id!);
                        try {
                            await deleteChecklistRun(run.id!, dataOwnerId);
                            setHiddenRunIds((current) => [...new Set([...current, run.id!])]);
                        } catch (error) {
                            Alert.alert(t("deleteInspection"), (error as Error).message);
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
            <SectionHeader title={t("fleetChecklists")} />
            <Card style={styles.intro}>
                <Text style={styles.title}>{t("consistentInspections")}</Text>
                <Text style={styles.body}>{t("consistentInspectionsBody")}</Text>
            </Card>
            <Card style={styles.form}>
                {!templates.length && templatesResolved ? (
                    <View style={styles.emptyTemplates}>
                        <Text style={styles.title}>{t("noChecklistAvailable")}</Text>
                        <Text style={styles.body}>{initializationError || templatesError?.message || (scopedServerResult?.error ? t("checklistServiceRefreshError") : t("noChecklistBody"))}</Text>
                        <Button label={t("createStarterChecklist")} icon="add-circle-outline" variant="secondary" onPress={() => void prepareDefaultChecklist()} loading={initializing} disabled={!canWrite} />
                    </View>
                ) : null}
                <SelectField label={t("vehicle")} value={vehicleId} onChange={setVehicleId} options={vehicles.map((vehicle) => ({ value: vehicle.id ?? "", label: [vehicle.vehicle_brand, vehicle.vehicle_model, vehicle.vehicle_license_plate].filter(Boolean).join(" · ") }))} />
                <SelectField label={t("checklist")} value={templateId} onChange={setTemplateId} options={templates.map((template) => ({ value: template.id ?? "", label: localizedChecklistText(template.name) }))} />
                <SelectField label={t("assignedDriver")} value={assignedUserId} onChange={setAssignedUserId} options={driverOptions} />
                <Button label={t("startInspection")} icon="clipboard-outline" onPress={() => void start()} loading={showStartingSpinner} disabled={!vehicleId || !selectedTemplate || !canWrite || starting} />
                {selectedTemplate ? <Button label={t("deleteSelectedTemplate")} icon="trash-outline" variant="danger" onPress={removeTemplate} loading={deleting} disabled={!canWrite || busy || starting} /> : null}
            </Card>
            <SectionHeader title={t("customTemplate")} />
            <Card style={styles.form}>
                <FormField label={t("templateName")} value={customName} onChangeText={setCustomName} />
                <FormField
                    label={t("checklistItems")}
                    value={customItems}
                    onChangeText={setCustomItems}
                    multiline
                    placeholder={t("checklistItemsPlaceholder")}
                    hint={t("oneItemPerLine")}
                />
                <Button label={t("saveTemplate")} icon="add" variant="secondary" onPress={() => void addTemplate()} loading={busy} disabled={!canWrite} />
            </Card>
            {runs.length ? (
                <>
                    <SectionHeader title={t("inspectionHistory")} />
                    <Card style={styles.list}>
                        {runs.map((run, index) => (
                            <View key={run.id ?? index}>
                                <Row
                                    icon={run.status === "passed" ? "checkmark-circle-outline" : run.status === "attention_required" ? "warning-outline" : "time-outline"}
                                    title={run.status === "passed" ? t("passed") : run.status === "attention_required" ? t("attentionRequired") : t("inProgress")}
                                    subtitle={`${new Date(run.started_at ?? Date.now()).toLocaleString(locale)}${run.driver_name ? ` · ${run.driver_name}` : ""}`}
                                    tone={run.status === "passed" ? "green" : run.status === "attention_required" ? "red" : "amber"}
                                    onPress={() => run.id && navigation.navigate("ChecklistRun", { runId: run.id })}
                                    trailing={run.id && canWrite ? (
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={t("deleteInspection")}
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
