import React, { PropsWithChildren, useEffect } from "react";
import { useReminders } from "../data/liveQueries";
import { usePreferences } from "../i18n/PreferencesProvider";
import { reconcileReminderNotifications } from "../services/reminderNotifications";
import { useAuth } from "./AuthProvider";
import { useGarage } from "./GarageProvider";

export function ReminderNotificationProvider({ children }: PropsWithChildren) {
    const { userId } = useAuth();
    const { vehicles } = useGarage();
    const { data: reminders, loading } = useReminders(userId);
    const { t } = usePreferences();

    useEffect(() => {
        if (!userId || loading) return;
        void reconcileReminderNotifications(reminders, vehicles, t("dueDate"), t("vehicle")).catch(() => undefined);
    }, [loading, reminders, t, userId, vehicles]);

    return <>{children}</>;
}
