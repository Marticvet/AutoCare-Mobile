import React, { PropsWithChildren, useEffect } from "react";
import { useSubscription } from "../billing/SubscriptionProvider";
import { syncPendingDocuments } from "../services/documentStorage";
import { useConnectivity } from "./ConnectivityProvider";
import { useGarage } from "./GarageProvider";

export function DocumentSyncProvider({ children }: PropsWithChildren) {
    const { dataOwnerId } = useGarage();
    const { isOnline } = useConnectivity();
    const { canCreateDocument } = useSubscription();

    useEffect(() => {
        if (isOnline && dataOwnerId) void syncPendingDocuments(dataOwnerId, canCreateDocument);
    }, [canCreateDocument, dataOwnerId, isOnline]);

    return <>{children}</>;
}
