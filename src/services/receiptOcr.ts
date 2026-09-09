import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { ExpenseCategory } from "../data/models";
import { system } from "../powersync/PowerSync";
import { edgeFunctionErrorMessage } from "./edgeFunctionError";

export type ReceiptSuggestion = {
    amount: number | null;
    date: string | null;
    vendor: string | null;
    title: string | null;
    category: ExpenseCategory;
    paymentMethod: string | null;
    confidence: { amount: string; date: string; vendor: string };
};

export type ReceiptOcrErrorMessages = {
    unavailable: string;
    sessionExpired: string;
    notDeployed: string;
    photoTooLarge: string;
    busy: string;
};

export async function recognizeReceipt(localUri: string, messages: ReceiptOcrErrorMessages): Promise<ReceiptSuggestion> {
    const optimized = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 1600 } }],
        { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG }
    );
    const imageBase64 = await FileSystem.readAsStringAsync(optimized.uri, {
        encoding: FileSystem.EncodingType.Base64,
    });
    const { data, error, response } = await system.supabaseConnector.client.functions.invoke("receipt-ocr", {
        body: { imageBase64 },
    });
    if (error) {
        throw new Error(await edgeFunctionErrorMessage(
            error,
            response,
            messages.unavailable,
            {
                401: messages.sessionExpired,
                404: messages.notDeployed,
                413: messages.photoTooLarge,
                429: messages.busy,
            }
        ));
    }
    if (data?.error) throw new Error(data.error);
    return data as ReceiptSuggestion;
}
