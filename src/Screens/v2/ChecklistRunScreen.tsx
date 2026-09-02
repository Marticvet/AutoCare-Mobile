import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { Button, Card, ChoiceChips, FormField, LoadingState, Screen, SectionHeader } from "../../components/ui";
import { useChecklistRunItems, useChecklistRuns } from "../../data/liveQueries";
import { completeChecklistRun, setChecklistItemResult } from "../../data/repository";
import { RootStackParamList } from "../../navigation/types";
import { useGarage } from "../../providers/GarageProvider";
import { colors, spacing, typography } from "../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "ChecklistRun">;

export default function ChecklistRunScreen({ route, navigation }: Props) {
    const { dataOwnerId, canWrite } = useGarage();
    const { data: runs } = useChecklistRuns(dataOwnerId);
    const run = runs.find((entry) => entry.id === route.params.runId);
    const { data: items, loading } = useChecklistRunItems(route.params.runId);
    const [signatureName, setSignatureName] = useState("");
    const [damageNotes, setDamageNotes] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!run) return;
        setSignatureName(run.signature_name ?? run.driver_name ?? "");
        setDamageNotes(run.damage_notes ?? "");
    }, [run]);
    if (loading && !items.length) return <Screen><LoadingState /></Screen>;
    const completed = run?.status === "passed" || run?.status === "attention_required";
    const finish = async () => {
        if (!signatureName.trim()) {
            Alert.alert("Driver sign-off", "Enter the driver’s name before completing the inspection.");
            return;
        }
        setBusy(true);
        try {
            await completeChecklistRun(route.params.runId, dataOwnerId, signatureName, damageNotes);
            Alert.alert("Inspection completed", items.some((item) => item.result === "fail") ? "The run was saved with attention required." : "The run passed.");
            navigation.goBack();
        } catch (error) {
            Alert.alert("Checklist", (error as Error).message);
        } finally {
            setBusy(false);
        }
    };
    return (
        <Screen>
            <SectionHeader title={completed ? "Inspection result" : "Complete inspection"} />
            {items.map((item, index) => (
                <Card key={item.id ?? index} style={styles.item}>
                    <Text style={styles.itemTitle}>{index + 1}. {item.label}</Text>
                    <ChoiceChips
                        value={item.result ?? "unchecked"}
                        onChange={(result) => item.id && void setChecklistItemResult(item.id, dataOwnerId, result as "pass" | "fail" | "not_applicable")}
                        options={[{ value: "pass", label: "Pass", icon: "checkmark" }, { value: "fail", label: "Fail", icon: "warning-outline" }, { value: "not_applicable", label: "N/A" }]}
                    />
                </Card>
            ))}
            <Card style={styles.form}>
                <FormField label="Damage / action notes" value={damageNotes} onChangeText={setDamageNotes} multiline />
                <FormField label="Driver signature (full name)" value={signatureName} onChangeText={setSignatureName} required hint="Typing the full name records the driver’s sign-off and completion time." />
            </Card>
            {!completed ? <Button label="Complete inspection" icon="checkmark-circle-outline" onPress={() => void finish()} loading={busy} disabled={!canWrite} /> : null}
        </Screen>
    );
}

const styles = StyleSheet.create({
    item: { gap: spacing.md },
    itemTitle: { ...typography.bodyStrong, color: colors.ink },
    form: { gap: spacing.lg },
});
