import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20261107000000_account_deletion_owned_data_cascade.sql"),
    "utf8",
);

describe("account-deletion foreign-key migration", () => {
    it("cascades legacy and current owned vehicle/expense relationships", () => {
        for (const [child, parent] of [
            ["vehicles", "profiles"],
            ["fuel_expenses", "profiles"],
            ["service_expenses", "vehicles"],
            ["vehicle_documents", "vehicles"],
            ["service_parts", "service_expenses"],
            ["checklist_run_items", "checklist_runs"],
        ]) {
            expect(migration).toContain(`('${child}', '${parent}')`);
        }
        expect(migration).toContain("on delete cascade");
        expect(migration).toContain("constraint_row.confdeltype <> 'c'");
        expect(migration).toContain("Account deletion has an unreviewed non-cascading foreign key to profiles or vehicles.");
    });

    it("removes an owner's shared garage access rows without targeting another member's identity", () => {
        expect(migration).toContain("('garage_memberships', 'garages')");
        expect(migration).not.toContain("('garage_memberships', 'profiles')");
        expect(migration).not.toContain("('garage_memberships', 'auth.users')");
    });

    it("preserves RevenueCat durable deletion state outside the Auth foreign-key graph", () => {
        expect(migration).toContain("RevenueCat tombstones and queue records intentionally have no reference to");
        expect(migration).not.toContain("revenuecat_deletion_requests', 'profiles'");
        expect(migration).not.toContain("revenuecat_deletion_tombstones', 'profiles'");
    });
});
