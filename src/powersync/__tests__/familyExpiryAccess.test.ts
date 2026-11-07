import * as fs from "node:fs";
import * as path from "node:path";

const repositoryFile = (...segments: string[]) =>
    fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("Family expiry access safety configuration", () => {
    it("requires an active entitlement before retained members can see garage metadata", () => {
        const migration = repositoryFile(
            "supabase",
            "migrations",
            "20261105000000_family_expiry_access_safety.sql"
        );

        expect(migration).toContain("public.billing_can_read_owner(target_owner_id)");
        expect(migration).toContain("garage.status = 'active'");
        expect(migration).toContain("public.billing_owner_has_family(target_owner_id)");
        expect(migration).toContain("garage.kind = 'family' and public.billing_owner_has_family(garage.owner_user_id)");
        expect(migration).not.toContain("select target_user_id = (select auth.uid())\n        or target_email");
    });

    it("uses validated stream queries to remove expired Family rows", () => {
        const syncConfig = repositoryFile("powersync", "sync-config.yaml");

        expect(syncConfig).not.toContain("    with:");
        expect(syncConfig).not.toContain("billing_owner_has_");
        expect(syncConfig).not.toContain("CURRENT_TIMESTAMP");
        expect(syncConfig).toContain("INNER JOIN billing_customers billing");
        expect(syncConfig).toContain("billing.status = 'active'");
        expect(syncConfig).toContain("billing.plan = 'family_monthly' OR billing.plan = 'family_yearly'");
        expect(syncConfig).toContain("SELECT * FROM garage_memberships");

        for (const table of [
            "vehicles",
            "fuel_expenses",
            "insurance_expenses",
            "service_expenses",
            "general_expenses",
            "reminders",
            "vehicle_documents",
            "service_parts",
            "charging_expenses",
            "vehicle_budgets",
            "trips",
            "report_schedules",
            "checklist_templates",
            "checklist_template_items",
            "checklist_runs",
            "checklist_run_items",
        ]) {
            expect(syncConfig).toContain(`SELECT * FROM ${table}`);
        }
    });
});
