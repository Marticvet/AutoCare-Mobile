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

    it("keeps current Family members synchronized through cancellation and billing recovery states", () => {
        const syncConfig = repositoryFile("powersync", "sync-config.yaml");
        const currentFamilyStatusPredicate = "billing.status IN ('active', 'cancelled', 'grace_period', 'billing_issue')";
        const entitlementChecks = syncConfig.match(/INNER JOIN billing_customers billing/g) ?? [];

        expect(syncConfig).not.toContain("    with:");
        expect(syncConfig).not.toContain("billing_owner_has_");
        expect(syncConfig).not.toContain("CURRENT_TIMESTAMP");
        expect(syncConfig).not.toContain("billing.status = 'active'");
        expect(entitlementChecks).toHaveLength(18);
        expect(syncConfig.match(new RegExp(currentFamilyStatusPredicate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? [])
            .toHaveLength(entitlementChecks.length);
        expect(currentFamilyStatusPredicate).toContain("'cancelled'");
        expect(currentFamilyStatusPredicate).toContain("'grace_period'");
        expect(currentFamilyStatusPredicate).toContain("'billing_issue'");
        expect(currentFamilyStatusPredicate).not.toContain("'expired'");
        expect(currentFamilyStatusPredicate).not.toContain("'refunded'");
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

    it("excludes nonmembers, pending invitations, inactive garages, and non-Family plans from every shared-data branch", () => {
        const syncConfig = repositoryFile("powersync", "sync-config.yaml");
        const sharedBranches = syncConfig.split("INNER JOIN billing_customers billing").slice(1);

        expect(sharedBranches).toHaveLength(18);
        for (const branch of sharedBranches) {
            const predicate = branch.slice(0, branch.indexOf("\n           )") >= 0
                ? branch.indexOf("\n           )")
                : branch.length);
            expect(predicate).toContain("membership.user_id = auth.user_id()");
            expect(predicate).toContain("membership.status = 'active'");
            expect(predicate).not.toContain("membership.status = 'pending'");
            expect(predicate).toContain("shared_garage.status = 'active'");
            expect(predicate).toContain("shared_garage.kind = 'family'");
            expect(predicate).toContain("billing.plan = 'family_monthly' OR billing.plan = 'family_yearly'");
        }
    });
});
