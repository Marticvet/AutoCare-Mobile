import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { Button, Card, ChoiceChips, EmptyState, FormField, LoadingState, Screen, SectionHeader } from "../../components/ui";
import { useChecklistRunItems, useChecklistRuns } from "../../data/liveQueries";
import { ChecklistRunItemRecord, ChecklistRunRecord } from "../../data/models";
import { completeChecklistRun, deleteChecklistRun, fetchChecklistRunFromServer, fetchChecklistRunItemsFromServer, setChecklistItemResult } from "../../data/repository";
import { RootStackParamList } from "../../navigation/types";
import { useGarage } from "../../providers/GarageProvider";
import { colors, spacing, typography } from "../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "ChecklistRun">;

export default function ChecklistRunScreen({ route, navigation }: Props) {
    const { dataOwnerId, canWrite } = useGarage();
    const initialRun = route.params.initialRun;
    const initialItems = useMemo(() => route.params.initialItems ?? [], [route.params.initialItems]);
    const { data: runs, loading: runsLoading } = useChecklistRuns(dataOwnerId);
    const localRun = runs.find((entry) => entry.id === route.params.runId);
    const { data: localItems, loading: itemsLoading } = useChecklistRunItems(route.params.runId);
    const serverScope = `${dataOwnerId}:${route.params.runId}`;
    const [serverResult, setServerResult] = useState<{
        scope: string;
        run: ChecklistRunRecord | null;
        items: ChecklistRunItemRecord[];
        loading: boolean;
        error: boolean;
    }>({ scope: "", run: null, items: [], loading: false, error: false });
    const [resultOverrides, setResultOverrides] = useState<Record<string, string>>({});
    const [hydratedRunId, setHydratedRunId] = useState<string | null>(null);
    const [signatureName, setSignatureName] = useState("");
    const [damageNotes, setDamageNotes] = useState("");
    const [busy, setBusy] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const pendingResultWrites = useRef(new Set<Promise<void>>());

    useEffect(() => {
        let mounted = true;
        if (!dataOwnerId || runsLoading || itemsLoading || ((localRun || initialRun) && (localItems.length || initialItems.length))) {
            return () => { mounted = false; };
        }

        setServerResult({ scope: serverScope, run: null, items: [], loading: true, error: false });
        void Promise.allSettled([
            localRun ? Promise.resolve(localRun) : fetchChecklistRunFromServer(route.params.runId, dataOwnerId),
            localItems.length ? Promise.resolve(localItems) : fetchChecklistRunItemsFromServer(route.params.runId, dataOwnerId),
        ]).then(([runResult, itemsResult]) => {
            if (!mounted) return;
            setServerResult({
                scope: serverScope,
                run: runResult.status === "fulfilled" ? runResult.value : null,
                items: itemsResult.status === "fulfilled" ? itemsResult.value : [],
                loading: false,
                error: runResult.status === "rejected" || itemsResult.status === "rejected",
            });
        });

        return () => { mounted = false; };
    }, [dataOwnerId, initialItems, initialRun, itemsLoading, localItems, localRun, route.params.runId, runsLoading, serverScope]);

    const scopedServerResult = serverResult.scope === serverScope ? serverResult : null;
    const run = localRun ?? initialRun ?? scopedServerResult?.run;
    const items = useMemo(() => {
        const merged = new Map<string, ChecklistRunItemRecord>();
        scopedServerResult?.items.forEach((item) => item.id && merged.set(item.id, item));
        initialItems.forEach((item) => item.id && merged.set(item.id, item));
        localItems.forEach((item) => item.id && merged.set(item.id, item));
        return [...merged.values()].sort((left, right) =>
            Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0)
        );
    }, [initialItems, localItems, scopedServerResult?.items]);

    useEffect(() => {
        if (!run || hydratedRunId === route.params.runId) return;
        setSignatureName(run.signature_name ?? run.driver_name ?? "");
        setDamageNotes(run.damage_notes ?? "");
        setHydratedRunId(route.params.runId);
    }, [hydratedRunId, route.params.runId, run]);

    const waitingForFallback = (!localRun || !localItems.length)
        && (!scopedServerResult || scopedServerResult.loading);
    if ((!run || !items.length) && (runsLoading || itemsLoading || waitingForFallback)) return <Screen><LoadingState /></Screen>;
    if (!run || !items.length) {
        return (
            <Screen>
                <EmptyState
                    icon="clipboard-outline"
                    title={!run ? "Inspection not found" : "This inspection has no items"}
                    body={scopedServerResult?.error
                        ? "The inspection could not be refreshed. Check your connection and try again."
                        : !run
                            ? "This inspection may have already been deleted."
                            : "Choose a checklist containing at least one item and start a new inspection."}
                    action="Back to checklists"
                    onAction={navigation.goBack}
                />
            </Screen>
        );
    }
    const completed = run?.status === "passed" || run?.status === "attention_required";
    const updateItemResult = async (item: ChecklistRunItemRecord, result: "pass" | "fail" | "not_applicable") => {
        if (!item.id || !canWrite || busy || deleting) return;
        const previous = resultOverrides[item.id] ?? item.result ?? "unchecked";
        setResultOverrides((current) => ({ ...current, [item.id!]: result }));
        const write = setChecklistItemResult(item.id, dataOwnerId, result);
        pendingResultWrites.current.add(write);
        try {
            await write;
        } catch (error) {
            setResultOverrides((current) => ({ ...current, [item.id!]: previous }));
            Alert.alert("Checklist", (error as Error).message);
        } finally {
            pendingResultWrites.current.delete(write);
        }
    };
    const finish = async () => {
        if (!signatureName.trim()) {
            Alert.alert("Driver sign-off", "Enter the driver’s name before completing the inspection.");
            return;
        }
        setBusy(true);
        try {
            await Promise.all([...pendingResultWrites.current]);
            await Promise.all(items.flatMap((item) => {
                if (!item.id || !resultOverrides[item.id]) return [];
                return [setChecklistItemResult(
                    item.id,
                    dataOwnerId,
                    resultOverrides[item.id] as "pass" | "fail" | "not_applicable"
                )];
            }));
            await completeChecklistRun(route.params.runId, dataOwnerId, signatureName, damageNotes);
            const hasFailure = items.some((item) => (item.id ? resultOverrides[item.id] : undefined) === "fail" || (!resultOverrides[item.id ?? ""] && item.result === "fail"));
            Alert.alert(
                completed ? "Inspection updated" : "Inspection completed",
                hasFailure ? "The inspection now requires attention." : "The inspection passed."
            );
            navigation.goBack();
        } catch (error) {
            Alert.alert("Checklist", (error as Error).message);
        } finally {
            setBusy(false);
        }
    };
    const remove = () => {
        if (!canWrite || busy || deleting) return;
        Alert.alert(
            "Delete inspection?",
            "This permanently deletes this inspection and all of its recorded checklist results.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => void (async () => {
                        setDeleting(true);
                        try {
                            await deleteChecklistRun(route.params.runId, dataOwnerId);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert("Delete inspection", (error as Error).message);
                        } finally {
                            setDeleting(false);
                        }
                    })(),
                },
            ]
        );
    };
    return (
        <Screen>
            <SectionHeader title={completed ? "Inspection result" : "Complete inspection"} />
            {items.map((item, index) => (
                <Card key={item.id ?? index} style={styles.item}>
                    <Text style={styles.itemTitle}>{index + 1}. {item.label}</Text>
                    <ChoiceChips
                        value={(item.id ? resultOverrides[item.id] : undefined) ?? item.result ?? "unchecked"}
                        onChange={(result) => void updateItemResult(item, result as "pass" | "fail" | "not_applicable")}
                        options={[{ value: "pass", label: "Pass", icon: "checkmark" }, { value: "fail", label: "Fail", icon: "warning-outline" }, { value: "not_applicable", label: "N/A" }]}
                        disabled={!canWrite || busy || deleting}
                    />
                </Card>
            ))}
            <Card style={styles.form}>
                <FormField label="Damage / action notes" value={damageNotes} onChangeText={setDamageNotes} multiline />
                <FormField label="Driver signature (full name)" value={signatureName} onChangeText={setSignatureName} required hint="Typing the full name records the driver’s sign-off and completion time." />
            </Card>
            <Button
                label={completed ? "Update inspection" : "Complete inspection"}
                icon="checkmark-circle-outline"
                onPress={() => void finish()}
                loading={busy}
                disabled={!canWrite || deleting}
            />
            {canWrite ? <Button label="Delete inspection" icon="trash-outline" variant="danger" onPress={remove} loading={deleting} disabled={busy} /> : null}
        </Screen>
    );
}

const styles = StyleSheet.create({
    item: { gap: spacing.md },
    itemTitle: { ...typography.bodyStrong, color: colors.ink },
    form: { gap: spacing.lg },
});
