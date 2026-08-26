import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import { VehicleDocument } from "../powersync/AppSchema";
import { system } from "../powersync/PowerSync";

const BUCKET = "vehicle-documents";
const DIRECTORY = `${FileSystem.documentDirectory}autocare-documents/`;
const DELETION_QUEUE_KEY = "@autocare/document-deletion-queue";
const localKey = (documentId: string) => `@autocare/document-uri/${documentId}`;

const safeFileName = (value: string) =>
    value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

export async function pickDocument(documentId: string) {
    const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "text/plain"],
        copyToCacheDirectory: true,
        multiple: false,
    });
    if (result.canceled || !result.assets[0]) return null;

    const asset = result.assets[0];
    await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true });
    const fileName = safeFileName(asset.name || `${documentId}.bin`);
    const destination = `${DIRECTORY}${documentId}-${fileName}`;
    const previousUri = await getLocalDocumentUri(documentId);
    const destinationInfo = await FileSystem.getInfoAsync(destination);
    if (destinationInfo.exists) await FileSystem.deleteAsync(destination, { idempotent: true });
    await FileSystem.copyAsync({ from: asset.uri, to: destination });
    if (previousUri && previousUri !== destination) {
        await FileSystem.deleteAsync(previousUri, { idempotent: true });
    }
    await AsyncStorage.setItem(localKey(documentId), destination);

    return {
        localUri: destination,
        fileName,
        mimeType: asset.mimeType ?? "application/octet-stream",
        fileSize: asset.size ?? 0,
    };
}

export async function captureDocument(documentId: string) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("Camera permission was not granted.");
    const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: true,
    });
    if (result.canceled || !result.assets[0]) return null;

    const asset = result.assets[0];
    await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true });
    const fileName = safeFileName(asset.fileName || `scan-${Date.now()}.jpg`);
    const destination = `${DIRECTORY}${documentId}-${fileName}`;
    const previousUri = await getLocalDocumentUri(documentId);
    const destinationInfo = await FileSystem.getInfoAsync(destination);
    if (destinationInfo.exists) await FileSystem.deleteAsync(destination, { idempotent: true });
    await FileSystem.copyAsync({ from: asset.uri, to: destination });
    if (previousUri && previousUri !== destination) {
        await FileSystem.deleteAsync(previousUri, { idempotent: true });
    }
    await AsyncStorage.setItem(localKey(documentId), destination);
    return {
        localUri: destination,
        fileName,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileSize: asset.fileSize ?? 0,
    };
}

export const getLocalDocumentUri = (documentId: string) =>
    AsyncStorage.getItem(localKey(documentId));

export async function removeLocalDocument(documentId: string) {
    const uri = await getLocalDocumentUri(documentId);
    if (uri) {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
    }
    await AsyncStorage.removeItem(localKey(documentId));
}

export async function uploadDocument(document: VehicleDocument, localUri: string) {
    if (!document.storage_path || !document.id) return;
    const response = await fetch(localUri);
    const bytes = await response.arrayBuffer();
    const { error } = await system.supabaseConnector.client.storage
        .from(BUCKET)
        .upload(document.storage_path, bytes, {
            contentType: document.mime_type ?? "application/octet-stream",
            upsert: true,
        });
    if (error) throw error;
    await system.db
        .updateTable("vehicle_documents")
        .set({ remote_url: document.storage_path })
        .where("id", "=", document.id)
        .execute();
}

export async function syncPendingDocuments(userId: string) {
    const deletionQueue = JSON.parse(
        (await AsyncStorage.getItem(DELETION_QUEUE_KEY)) ?? "[]"
    ) as string[];
    const remainingDeletions: string[] = [];
    for (const storagePath of deletionQueue) {
        try {
            const { error } = await system.supabaseConnector.client.storage
                .from(BUCKET)
                .remove([storagePath]);
            if (error) throw error;
        } catch {
            remainingDeletions.push(storagePath);
        }
    }
    await AsyncStorage.setItem(DELETION_QUEUE_KEY, JSON.stringify(remainingDeletions));

    const pending = await system.db
        .selectFrom("vehicle_documents")
        .selectAll()
        .where("user_id", "=", userId)
        .where("remote_url", "is", null)
        .where("storage_path", "is not", null)
        .execute();

    for (const document of pending) {
        if (!document.id) continue;
        const localUri = await getLocalDocumentUri(document.id);
        if (!localUri) continue;
        try {
            await uploadDocument(document, localUri);
        } catch {
            // Keep the metadata and local file queued for the next online attempt.
        }
    }
}

export async function openDocument(document: VehicleDocument, isOnline: boolean) {
    if (!document.id) return false;
    const localUri = await getLocalDocumentUri(document.id);
    if (localUri) {
        const info = await FileSystem.getInfoAsync(localUri);
        if (info.exists) {
            if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(localUri);
            else await Linking.openURL(localUri);
            return true;
        }
    }

    if (isOnline && document.storage_path) {
        const { data, error } = await system.supabaseConnector.client.storage
            .from(BUCKET)
            .createSignedUrl(document.storage_path, 60 * 10);
        if (error) throw error;
        await Linking.openURL(data.signedUrl);
        return true;
    }

    return false;
}

async function queueRemoteDeletion(storagePath: string) {
    const queued = JSON.parse(
        (await AsyncStorage.getItem(DELETION_QUEUE_KEY)) ?? "[]"
    ) as string[];
    if (!queued.includes(storagePath)) queued.push(storagePath);
    await AsyncStorage.setItem(DELETION_QUEUE_KEY, JSON.stringify(queued));
}

export async function deleteRemotePath(storagePath: string, isOnline: boolean) {
    if (isOnline) {
        try {
            const { error } = await system.supabaseConnector.client.storage
                .from(BUCKET)
                .remove([storagePath]);
            if (error) throw error;
            return;
        } catch {
            // Reconcile the cloud object during the next successful online pass.
        }
    }
    await queueRemoteDeletion(storagePath);
}

export async function deleteStoredDocument(document: VehicleDocument, isOnline: boolean) {
    if (document.storage_path) await deleteRemotePath(document.storage_path, isOnline);
    if (document.id) await removeLocalDocument(document.id);
}
