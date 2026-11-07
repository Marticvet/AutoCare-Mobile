import React, { PropsWithChildren, useEffect, useMemo } from "react";
import * as Notifications from "expo-notifications";
import { useReminders } from "../data/liveQueries";
import { usePreferences } from "../i18n/PreferencesProvider";
import { reconcileReminderNotifications } from "../services/reminderNotifications";
import { completeReminder } from "../data/repository";
import { openReminder } from "../navigation/navigationRef";
import { useGarage } from "./GarageProvider";

export function ReminderNotificationProvider({ children }: PropsWithChildren) {
    const { vehicles, dataOwnerId } = useGarage();
    const { data: reminders, loading } = useReminders(dataOwnerId);
    const { t } = usePreferences();
    const systemLabels = useMemo(() => ({
        channelName: t("vehicleRemindersChannel"),
        channelDescription: t("vehicleRemindersChannelBody"),
        open: t("openReminder"),
        markComplete: t("markComplete"),
    }), [t]);

    useEffect(() => {
        if (!dataOwnerId || loading) return;
        void reconcileReminderNotifications(reminders, vehicles, t("dueDate"), t("vehicle"), systemLabels).catch(() => undefined);
    }, [dataOwnerId, loading, reminders, systemLabels, t, vehicles]);

    useEffect(() => {
        let active = true;
        const handleResponse = (response: Notifications.NotificationResponse) => {
            // A response can be delivered while a logout/account switch is in
            // progress. Do not apply a reminder action without the current
            // garage owner, and ignore callbacks from a disposed listener.
            if (!active || !dataOwnerId) return;
            const data = response.notification.request.content.data;
            if (data?.kind !== "vehicle-reminder" || typeof data.reminderId !== "string") return;
            if (response.actionIdentifier === "completeReminder") {
                void completeReminder(data.reminderId, dataOwnerId);
                return;
            }
            openReminder(data.reminderId);
        };
        const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
        void Notifications.getLastNotificationResponseAsync().then((response) => {
            if (!active || !response) return;
            handleResponse(response);
            if (active) return Notifications.clearLastNotificationResponseAsync();
        }).catch(() => undefined);
        return () => {
            active = false;
            subscription.remove();
        };
    }, [dataOwnerId]);

    return <>{children}</>;
}
