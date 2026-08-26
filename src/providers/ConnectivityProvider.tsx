import NetInfo from "@react-native-community/netinfo";
import React, {
    PropsWithChildren,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import { useSystem } from "../powersync/PowerSync";

type SyncState = "offline" | "connecting" | "syncing" | "synced" | "error";

type ConnectivityContextValue = {
    isOnline: boolean;
    syncState: SyncState;
    syncError?: string;
    lastSyncedAt?: Date;
};

const ConnectivityContext = createContext<ConnectivityContextValue>({
    isOnline: true,
    syncState: "connecting",
});

export function ConnectivityProvider({ children }: PropsWithChildren) {
    const { powersync } = useSystem();
    const [isOnline, setIsOnline] = useState(true);
    const [, setStatusVersion] = useState(0);

    useEffect(
        () =>
            NetInfo.addEventListener((state) => {
                setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
            }),
        []
    );

    useEffect(
        () =>
            powersync.registerListener({
                statusChanged: () => setStatusVersion((version) => version + 1),
            }),
        [powersync]
    );

    const status = powersync.currentStatus;
    const flow = status.dataFlowStatus;
    const flowError = flow.uploadError ?? flow.downloadError;
    const errorValue = flowError as unknown as { message?: unknown };
    const syncError = flowError
        ? flowError instanceof Error
            ? flowError.message
            : errorValue.message
                ? String(errorValue.message)
                : String(flowError)
        : undefined;
    let syncState: SyncState = "synced";

    if (!isOnline) syncState = "offline";
    else if (flow.uploadError || flow.downloadError) syncState = "error";
    else if (status.connecting || !status.connected) syncState = "connecting";
    else if (flow.uploading || flow.downloading) syncState = "syncing";

    const value: ConnectivityContextValue = {
        isOnline,
        syncState,
        syncError,
        lastSyncedAt: status.lastSyncedAt,
    };

    return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

export const useConnectivity = () => useContext(ConnectivityContext);
