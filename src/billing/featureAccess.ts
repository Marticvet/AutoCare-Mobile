import type { CustomerInfo } from "react-native-purchases";
import { ENTITLEMENTS } from "./entitlements";
import type { BackendBillingStatus, FeatureAccess } from "./types";

const BACKEND_ACCESS_STATUSES = new Set([
    "active",
    "grace_period",
    "billing_issue",
    "cancelled",
]);

export function backendHasPlus(
    status: BackendBillingStatus | null,
    now = Date.now()
) {
    if (backendIsAdmin(status)) return true;
    if (!status || !backendAccessIsCurrent(status, now)) return false;
    return status.plan === "fleet" || backendEntitlements(status).has(ENTITLEMENTS.plusFeatures);
}

export function backendHasFamily(
    status: BackendBillingStatus | null,
    now = Date.now()
) {
    if (backendIsAdmin(status)) return true;
    if (!status || !backendAccessIsCurrent(status, now)) return false;
    return backendEntitlements(status).has(ENTITLEMENTS.sharedGarage)
        || status.plan === "family_monthly"
        || status.plan === "family_yearly";
}

export function backendHasFleet(
    status: BackendBillingStatus | null,
    now = Date.now()
) {
    return backendAccessIsCurrent(status, now) && status?.plan === "fleet";
}

export function backendIsAdmin(status: BackendBillingStatus | null) {
    return Boolean(status?.is_admin);
}

function backendAccessIsCurrent(
    status: BackendBillingStatus | null,
    now: number
) {
    if (!status) return false;
    if (!BACKEND_ACCESS_STATUSES.has(status.status)) return false;
    return !status.expires_at || new Date(status.expires_at).getTime() > now;
}

function backendEntitlements(status: BackendBillingStatus) {
    return new Set([
        ...(status.entitlement_ids ?? []),
        ...(status.entitlement_id ? [status.entitlement_id] : []),
    ]);
}

export function customerInfoHasPlus(customerInfo: CustomerInfo | null) {
    return Boolean(customerInfo?.entitlements.active[ENTITLEMENTS.plusFeatures]);
}

export function customerInfoHasFamily(customerInfo: CustomerInfo | null) {
    return Boolean(customerInfo?.entitlements.active[ENTITLEMENTS.sharedGarage]);
}

export function deriveFeatureAccess(
    customerInfo: CustomerInfo | null,
    backendStatus: BackendBillingStatus | null
): FeatureAccess {
    const isAdmin = backendIsAdmin(backendStatus);
    const hasFamily = customerInfoHasFamily(customerInfo) || backendHasFamily(backendStatus);
    const hasFleet = backendHasFleet(backendStatus);
    const hasPlus = customerInfoHasPlus(customerInfo) || backendHasPlus(backendStatus) || hasFamily || hasFleet;
    return {
        isAdmin,
        hasPlus,
        hasFamily,
        hasFleet,
        canShareGarage: hasFamily || hasFleet,
        memberLimit: hasFamily ? 6 : hasFleet ? null : 1,
        canAddVehicle: (currentVehicleCount) => currentVehicleCount < 1 || hasPlus,
        canCreateDocument: hasPlus,
        canExportReports: hasPlus,
        canUseAdvancedInsights: hasPlus,
        canCreateRecurringReminder: hasPlus,
    };
}
