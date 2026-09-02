import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { system } from "../powersync/PowerSync";

export async function exportAccountData(userId: string) {
    const [profile, vehicles, fuel, charging, insurance, service, general, reminders, documents, parts, budgets, trips, schedules, templates, templateItems, runs, runItems] = await Promise.all([
        system.db.selectFrom("profiles").selectAll().where("id", "=", userId).execute(),
        system.db.selectFrom("vehicles").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("fuel_expenses").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("charging_expenses").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("insurance_expenses").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("service_expenses").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("general_expenses").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("reminders").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("vehicle_documents").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("service_parts").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("vehicle_budgets").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("trips").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("report_schedules").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("checklist_templates").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("checklist_template_items").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("checklist_runs").selectAll().where("user_id", "=", userId).execute(),
        system.db.selectFrom("checklist_run_items").selectAll().where("user_id", "=", userId).execute(),
    ]);
    const payload = {
        exported_at: new Date().toISOString(),
        format_version: 1,
        profile,
        vehicles,
        expenses: { fuel, charging, insurance, service, general, service_parts: parts },
        reminders,
        documents: documents.map((document) => ({ ...document, remote_url: null })),
        budgets,
        trips,
        report_schedules: schedules,
        checklists: { templates, template_items: templateItems, runs, run_items: runItems },
    };
    const path = `${FileSystem.cacheDirectory}autocare-account-export-${new Date().toISOString().slice(0, 10)}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
    if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device.");
    await Sharing.shareAsync(path, { mimeType: "application/json", dialogTitle: "AutoCare account export" });
    return path;
}

export async function deleteCloudAccount() {
    const { data, error } = await system.supabaseConnector.client.functions.invoke("delete-account", { body: { confirmation: "DELETE" } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
}
