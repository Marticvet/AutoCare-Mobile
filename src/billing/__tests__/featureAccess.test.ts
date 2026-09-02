import { backendHasPlus, deriveFeatureAccess } from "../featureAccess";
import type { BackendBillingStatus } from "../types";

const activeStatus = (overrides: Partial<BackendBillingStatus> = {}): BackendBillingStatus => ({
    user_id: "11111111-1111-4111-8111-111111111111",
    is_admin: false,
    entitlement_id: "plus_features",
    entitlement_ids: ["plus_features"],
    plan: "plus_monthly",
    product_id: "autocare_plus_monthly",
    status: "active",
    expires_at: "2099-01-01T00:00:00.000Z",
    will_renew: true,
    store: "test_store",
    environment: "SANDBOX",
    updated_at: "2026-08-26T00:00:00.000Z",
    ...overrides,
});

describe("feature access", () => {
    it("keeps the first vehicle free and gates the second", () => {
        const access = deriveFeatureAccess(null, null);
        expect(access.canAddVehicle(0)).toBe(true);
        expect(access.canAddVehicle(1)).toBe(false);
        expect(access.canCreateDocument).toBe(false);
        expect(access.canExportReports).toBe(false);
        expect(access.canCreateRecurringReminder).toBe(false);
    });

    it("unlocks all Plus features from the trusted backend mirror", () => {
        const access = deriveFeatureAccess(null, activeStatus());
        expect(access.hasPlus).toBe(true);
        expect(access.canAddVehicle(3)).toBe(true);
        expect(access.canCreateDocument).toBe(true);
        expect(access.canUseAdvancedInsights).toBe(true);
    });

    it("makes Family a superset of Plus with six garage members", () => {
        const access = deriveFeatureAccess(null, activeStatus({
            entitlement_id: "shared_garage",
            entitlement_ids: ["plus_features", "shared_garage"],
            plan: "family_monthly",
            product_id: "autocare_family_monthly",
        }));
        expect(access.hasPlus).toBe(true);
        expect(access.hasFamily).toBe(true);
        expect(access.canShareGarage).toBe(true);
        expect(access.memberLimit).toBe(6);
    });

    it("recognizes Fleet as server-managed access", () => {
        const access = deriveFeatureAccess(null, activeStatus({
            entitlement_id: null,
            entitlement_ids: [],
            plan: "fleet",
        }));
        expect(access.hasFleet).toBe(true);
        expect(access.hasPlus).toBe(true);
        expect(access.memberLimit).toBeNull();
    });

    it("unlocks premium features for a server-designated administrator without a subscription", () => {
        const access = deriveFeatureAccess(null, activeStatus({
            is_admin: true,
            entitlement_id: null,
            entitlement_ids: [],
            plan: "free",
            product_id: null,
            status: "unknown",
            expires_at: null,
            will_renew: false,
        }));
        expect(access.isAdmin).toBe(true);
        expect(access.hasPlus).toBe(true);
        expect(access.hasFamily).toBe(true);
        expect(access.hasFleet).toBe(false);
        expect(access.canAddVehicle(20)).toBe(true);
        expect(access.canCreateDocument).toBe(true);
    });

    it("keeps cancelled subscriptions active until their expiration", () => {
        expect(backendHasPlus(activeStatus({ status: "cancelled" }), Date.parse("2027-01-01"))).toBe(true);
        expect(backendHasPlus(activeStatus({ status: "cancelled" }), Date.parse("2100-01-01"))).toBe(false);
    });

    it("blocks expired and refunded subscriptions", () => {
        expect(backendHasPlus(activeStatus({ status: "expired" }))).toBe(false);
        expect(backendHasPlus(activeStatus({ status: "refunded" }))).toBe(false);
    });
});
