import React, { PropsWithChildren, useEffect } from "react";
import { syncPendingDocuments } from "../services/documentStorage";
import { useAuth } from "./AuthProvider";
import { useConnectivity } from "./ConnectivityProvider";

export function DocumentSyncProvider({ children }: PropsWithChildren) {
    const { userId } = useAuth();
    const { isOnline } = useConnectivity();

    useEffect(() => {
        if (isOnline && userId) void syncPendingDocuments(userId);
    }, [isOnline, userId]);

    return <>{children}</>;
}

