import type {
    CustomerInfo,
    PurchasesOffering,
    PurchasesPackage,
} from "react-native-purchases";
import type { EntitlementId } from "./entitlements";

export type BillingPlan =
    | "free"
    | "plus_monthly"
    | "plus_yearly"
    | "family_monthly"
    | "family_yearly"
    | "fleet";
export type BillingStatus =
    | "active"
    | "grace_period"
    | "billing_issue"
    | "cancelled"
    | "expired"
    | "refunded"
    | "unknown";

export type BackendBillingStatus = {
    user_id: string;
    is_admin: boolean;
    entitlement_id: string | null;
    entitlement_ids: string[];
    plan: BillingPlan;
    product_id: string | null;
    status: BillingStatus;
    expires_at: string | null;
    will_renew: boolean;
    store: string | null;
    environment: string | null;
    updated_at: string;
};

export type FeatureAccess = {
    isAdmin: boolean;
    hasPlus: boolean;
    hasFamily: boolean;
    hasFleet: boolean;
    canShareGarage: boolean;
    memberLimit: number | null;
    canAddVehicle: (currentVehicleCount: number) => boolean;
    canCreateDocument: boolean;
    canExportReports: boolean;
    canUseAdvancedInsights: boolean;
    canCreateRecurringReminder: boolean;
};

export type SubscriptionContextValue = FeatureAccess & {
    configured: boolean;
    loading: boolean;
    purchasing: boolean;
    error: string | null;
    customerInfo: CustomerInfo | null;
    backendStatus: BackendBillingStatus | null;
    currentOffering: PurchasesOffering | null;
    refresh: () => Promise<void>;
    purchase: (selectedPackage: PurchasesPackage, requiredEntitlement?: EntitlementId) => Promise<boolean>;
    restorePurchases: (requiredEntitlement?: EntitlementId) => Promise<boolean>;
    manageSubscription: () => Promise<void>;
    clearError: () => void;
};
