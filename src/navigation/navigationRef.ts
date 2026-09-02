import { createNavigationContainerRef } from "@react-navigation/native";
import { RootStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function openReminder(reminderId: string) {
    if (navigationRef.isReady()) navigationRef.navigate("ReminderForm", { reminderId });
}
