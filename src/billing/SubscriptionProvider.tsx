import React, {
    PropsWithChildren,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import type {
    CustomerInfo,
    CustomerInfoUpdateListener,
    PurchasesPackage,
} from "react-native-purchases";
import { useSystem } from "../powersync/PowerSync";
import { useAuth } from "../providers/AuthProvider";
import { useGarage } from "../providers/GarageProvider";
import { deriveFeatureAccess } from "./featureAccess";
import { ENTITLEMENTS, type EntitlementId } from "./entitlements";
import {
    Purchases,
    clearRevenueCatUser,
    configureRevenueCat,
    loadRevenueCatState,
    openRevenueCatSubscriptionManagement,
    purchaseRevenueCatPackage,
    restoreRevenueCatPurchases,
} from "./revenueCat";
import type {
    BackendBillingStatus,
    SubscriptionContextValue,
} from "./types";

const emptyAccess = deriveFeatureAccess(null, null);
const SubscriptionContext = createContext<SubscriptionContextValue>({
    ...emptyAccess,
    configured: false,
    loading: true,
    purchasing: false,
    error: null,
    customerInfo: null,
    backendStatus: null,
    currentOffering: null,
    refresh: async () => undefined,
    purchase: async () => false,
    restorePurchases: async () => false,
    manageSubscription: async () => undefined,
    clearError: () => undefined,
});

function errorMessage(error: unknown, fallback: string) {
    if (typeof error === "object" && error && "userCancelled" in error && error.userCancelled) return "";
    return error instanceof Error ? error.message : fallback;
}

export function SubscriptionProvider({ children }: PropsWithChildren) {
    const { userId } = useAuth();
    const { activeGarage, canWrite, currentRole } = useGarage();
    const { supabaseConnector } = useSystem();
    const [configured, setConfigured] = useState(false);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [backendStatus, setBackendStatus] = useState<BackendBillingStatus | null>(null);
    const [currentOffering, setCurrentOffering] = useState<SubscriptionContextValue["currentOffering"]>(null);

    const loadBackendStatus = useCallback(async () => {
        if (!userId) {
            setBackendStatus(null);
            return null;
        }
        let { data, error: queryError } = await supabaseConnector.client
            .from("billing_customers")
            .select("user_id, is_admin, entitlement_id, entitlement_ids, plan, product_id, status, expires_at, will_renew, store, environment, updated_at")
            .eq("user_id", userId)
            .maybeSingle();
        if (queryError && queryError.message.includes("is_admin")) {
            const fallback = await supabaseConnector.client
                .from("billing_customers")
                .select("user_id, entitlement_id, entitlement_ids, plan, product_id, status, expires_at, will_renew, store, environment, updated_at")
                .eq("user_id", userId)
                .maybeSingle();
            data = fallback.data ? { ...fallback.data, is_admin: false } : null;
            queryError = fallback.error;
        }
        if (queryError && queryError.code !== "42P01") throw queryError;
        const trustedStatus = (data as BackendBillingStatus | null) ?? null;
        setBackendStatus(trustedStatus);
        return trustedStatus;
    }, [supabaseConnector, userId]);

    const syncTrustedMirror = useCallback(async () => {
        if (!userId) return;
        const { error: functionError } = await supabaseConnector.client.functions.invoke("sync-entitlements", {
            body: {},
        });
        if (functionError) throw functionError;
        await loadBackendStatus();
    }, [loadBackendStatus, supabaseConnector, userId]);

    const refresh = useCallback(async () => {
        if (!userId) return;
        setError(null);
        try {
            const trustedStatus = await loadBackendStatus();
            if (trustedStatus?.is_admin) return;
            if (!configured) return;
            const state = await loadRevenueCatState();
            setCustomerInfo(state.customerInfo);
            setCurrentOffering(state.currentOffering);
            await syncTrustedMirror();
        } catch (caught) {
            const message = errorMessage(caught, "Subscription status could not be refreshed.");
            if (message) setError(message);
        }
    }, [configured, loadBackendStatus, syncTrustedMirror, userId]);

    useEffect(() => {
        let mounted = true;
        let listener: CustomerInfoUpdateListener | null = null;

        if (!userId) {
            setCustomerInfo(null);
            setBackendStatus(null);
            setCurrentOffering(null);
            setConfigured(false);
            setLoading(false);
            void clearRevenueCatUser().catch(() => undefined);
            return;
        }

        setLoading(true);
        setError(null);
        void (async () => {
            try {
                const trustedStatus = await loadBackendStatus();
                if (!mounted) return;
                if (trustedStatus?.is_admin) {
                    setConfigured(false);
                    setCustomerInfo(null);
                    setCurrentOffering(null);
                    return;
                }
                const isConfigured = await configureRevenueCat(userId);
                if (!mounted) return;
                setConfigured(isConfigured);
                if (!isConfigured) {
                    setError("RevenueCat public API keys are not configured for this build.");
                    return;
                }
                listener = (updated) => {
                    if (!mounted) return;
                    setCustomerInfo(updated);
                    void syncTrustedMirror().catch(() => undefined);
                };
                Purchases.addCustomerInfoUpdateListener(listener);
                const state = await loadRevenueCatState();
                if (!mounted) return;
                setCustomerInfo(state.customerInfo);
                setCurrentOffering(state.currentOffering);
                void syncTrustedMirror().catch(() => undefined);
            } catch (caught) {
                if (mounted) setError(errorMessage(caught, "Subscriptions are temporarily unavailable."));
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
            if (listener) Purchases.removeCustomerInfoUpdateListener(listener);
        };
    }, [loadBackendStatus, syncTrustedMirror, userId]);

    const purchase = useCallback(async (selectedPackage: PurchasesPackage, requiredEntitlement?: EntitlementId) => {
        setPurchasing(true);
        setError(null);
        try {
            const result = await purchaseRevenueCatPackage(selectedPackage);
            setCustomerInfo(result.customerInfo);
            await syncTrustedMirror();
            if (requiredEntitlement) return Boolean(result.customerInfo.entitlements.active[requiredEntitlement]);
            return Boolean(result.customerInfo.entitlements.active[ENTITLEMENTS.plusFeatures]
                || result.customerInfo.entitlements.active[ENTITLEMENTS.sharedGarage]);
        } catch (caught) {
            const message = errorMessage(caught, "The purchase could not be completed.");
            if (message) setError(message);
            return false;
        } finally {
            setPurchasing(false);
        }
    }, [syncTrustedMirror]);

    const restorePurchases = useCallback(async (requiredEntitlement?: EntitlementId) => {
        setPurchasing(true);
        setError(null);
        try {
            const updated = await restoreRevenueCatPurchases();
            setCustomerInfo(updated);
            await syncTrustedMirror();
            if (requiredEntitlement) return Boolean(updated.entitlements.active[requiredEntitlement]);
            return Boolean(updated.entitlements.active[ENTITLEMENTS.plusFeatures]
                || updated.entitlements.active[ENTITLEMENTS.sharedGarage]);
        } catch (caught) {
            const message = errorMessage(caught, "Purchases could not be restored.");
            if (message) setError(message);
            return false;
        } finally {
            setPurchasing(false);
        }
    }, [syncTrustedMirror]);

    const manageSubscription = useCallback(async () => {
        setError(null);
        try {
            await openRevenueCatSubscriptionManagement();
        } catch (caught) {
            const message = errorMessage(caught, "Subscription management is unavailable for this store.");
            if (message) setError(message);
        }
    }, []);

    const access = useMemo(() => {
        const ownAccess = deriveFeatureAccess(customerInfo, backendStatus);
        const usesSharedTier = Boolean(
            activeGarage
            && activeGarage.owner_user_id !== userId
            && activeGarage.membership_status === "active"
            && activeGarage.status === "active"
            && (activeGarage.kind === "family" || activeGarage.kind === "fleet")
        );
        if (!usesSharedTier) return ownAccess;
        const hasFleet = activeGarage?.kind === "fleet";
        return {
            ...ownAccess,
            hasPlus: true,
            hasFamily: !hasFleet,
            hasFleet,
            canShareGarage: currentRole === "owner" || currentRole === "admin",
            memberLimit: activeGarage?.seat_limit ?? null,
            canAddVehicle: () => canWrite,
            canCreateDocument: canWrite,
            canExportReports: true,
            canUseAdvancedInsights: true,
            canCreateRecurringReminder: canWrite,
        };
    }, [activeGarage, backendStatus, canWrite, currentRole, customerInfo, userId]);
    const value = useMemo<SubscriptionContextValue>(() => ({
        ...access,
        configured,
        loading,
        purchasing,
        error,
        customerInfo,
        backendStatus,
        currentOffering,
        refresh,
        purchase,
        restorePurchases,
        manageSubscription,
        clearError: () => setError(null),
    }), [access, backendStatus, configured, currentOffering, customerInfo, error, loading, manageSubscription, purchase, purchasing, refresh, restorePurchases]);

    return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export const useSubscription = () => useContext(SubscriptionContext);
