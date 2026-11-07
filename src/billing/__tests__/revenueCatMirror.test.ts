import {
    FAMILY_ENTITLEMENT,
    PLUS_ENTITLEMENT,
    mirrorRowFromSubscriber,
} from "../../../supabase/functions/_shared/revenuecat-mirror";

const userId = "11111111-1111-4111-8111-111111111111";
const future = "2099-01-01T00:00:00.000Z";
const past = "2000-01-01T00:00:00.000Z";

describe("RevenueCat subscriber mirror", () => {
    it("prefers Family when both supported entitlements are active", () => {
        const row = mirrorRowFromSubscriber(userId, {
            subscriber: {
                entitlements: {
                    [PLUS_ENTITLEMENT]: { product_identifier: "autocare_plus_monthly", expires_date: future },
                    [FAMILY_ENTITLEMENT]: { product_identifier: "autocare_family_yearly", expires_date: future },
                },
                subscriptions: {
                    autocare_family_yearly: { store: "app_store", is_sandbox: true },
                },
            },
        }, "evt_family", "PRODUCT_CHANGE");

        expect(row.entitlement_id).toBe(FAMILY_ENTITLEMENT);
        expect(row.entitlement_ids).toEqual([PLUS_ENTITLEMENT, FAMILY_ENTITLEMENT]);
        expect(row.plan).toBe("family_yearly");
        expect(row.status).toBe("active");
        expect(row.environment).toBe("SANDBOX");
    });

    it("keeps cancellation active until expiry and records billing conditions", () => {
        const cancelled = mirrorRowFromSubscriber(userId, {
            subscriber: {
                entitlements: { [PLUS_ENTITLEMENT]: { product_identifier: "autocare_plus_monthly", expires_date: future } },
                subscriptions: { autocare_plus_monthly: { unsubscribe_detected_at: "2026-01-01T00:00:00.000Z" } },
            },
        });
        const billingIssue = mirrorRowFromSubscriber(userId, {
            subscriber: {
                entitlements: { [PLUS_ENTITLEMENT]: { product_identifier: "autocare_plus_monthly", expires_date: future } },
                subscriptions: { autocare_plus_monthly: { billing_issues_detected_at: "2026-01-01T00:00:00.000Z" } },
            },
        });

        expect(cancelled.status).toBe("cancelled");
        expect(cancelled.will_renew).toBe(false);
        expect(billingIssue.status).toBe("billing_issue");
    });

    it("uses an authoritative current subscriber response for expiry and refund events", () => {
        const expired = mirrorRowFromSubscriber(userId, {
            subscriber: {
                entitlements: { [PLUS_ENTITLEMENT]: { product_identifier: "autocare_plus_monthly", expires_date: past } },
            },
        }, "evt_expired", "EXPIRATION");
        const refunded = mirrorRowFromSubscriber(userId, {
            subscriber: {
                entitlements: { [PLUS_ENTITLEMENT]: { product_identifier: "autocare_plus_monthly", expires_date: past } },
            },
        }, "evt_refunded", "REFUND");
        const activeAfterOldRefund = mirrorRowFromSubscriber(userId, {
            subscriber: {
                entitlements: { [PLUS_ENTITLEMENT]: { product_identifier: "autocare_plus_monthly", expires_date: future } },
            },
        }, "evt_old_refund", "REFUND");

        expect(expired.status).toBe("expired");
        expect(refunded.status).toBe("refunded");
        expect(activeAfterOldRefund.status).toBe("active");
    });
});
