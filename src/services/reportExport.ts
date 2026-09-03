import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { ExpenseRecord } from "../data/models";
import { expensesToCsv, isoDate } from "../utils/tracking";

export async function exportExpensesCsv(expenses: ExpenseRecord[], currency: string) {
    const path = `${FileSystem.cacheDirectory}autocare-expenses-${isoDate()}.csv`;
    await FileSystem.writeAsStringAsync(path, expensesToCsv(expenses, currency), {
        encoding: FileSystem.EncodingType.UTF8,
    });
    if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device.");
    await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "AutoCare expense report" });
    return path;
}
