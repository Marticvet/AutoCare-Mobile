import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { ReminderRecord, VehicleRecord } from "../data/models";

const CHANNEL_ID = "vehicle-reminders";
export const REMINDER_CATEGORY_ID = "vehicleReminder";
const identifierFor = (reminderId: string) => `autocare-reminder-${reminderId}`;
export const DEFAULT_REMINDER_TIME = "09:00";
let reconciliation: Promise<unknown> = Promise.resolve();

// Serialize form writes and live-query reconciliation against the native queue.
function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = reconciliation.then(operation, operation);
    reconciliation = next.catch(() => undefined);
    return next;
}

export function reminderTriggerDate(dueDate: string, dueTime?: string | null, before = 0) {
    const date = new Date(`${dueDate}T${normalizeReminderTime(dueTime)}:00`);
    date.setMinutes(date.getMinutes() - Math.max(0, before));
    return date;
}

export type ReminderSystemLabels = {
    channelName: string;
    channelDescription: string;
    open: string;
    markComplete: string;
};

export const normalizeReminderTime = (value?: string | null) => {
    const match = value?.match(/^([01]\d|2[0-3]):([0-5]\d)/);
    return match ? `${match[1]}:${match[2]}` : DEFAULT_REMINDER_TIME;
};

export const getReminderNotificationContent = ({
    title,
    dueDate,
    dueTime,
    vehicleLabel,
    dueLabel,
    notificationTitle,
    notificationBody,
}: {
    title: string;
    dueDate: string;
    dueTime?: string | null;
    vehicleLabel: string;
    dueLabel: string;
    notificationTitle?: string | null;
    notificationBody?: string | null;
}) => ({
    title: notificationTitle?.trim() || title.trim(),
    body: notificationBody?.trim() || `${vehicleLabel} · ${dueLabel}: ${dueDate} · ${normalizeReminderTime(dueTime)}`,
});

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
});

async function ensureAndroidChannel(labels: ReminderSystemLabels) {
    if (Platform.OS !== "android") return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: labels.channelName,
        description: labels.channelDescription,
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 200, 250],
        sound: "default",
    });
}

async function ensureNotificationCategory(labels: ReminderSystemLabels) {
    await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
        { identifier: "openReminder", buttonTitle: labels.open },
        { identifier: "completeReminder", buttonTitle: labels.markComplete },
    ]);
}

export async function getReminderNotificationPermission() {
    const permission = await Notifications.getPermissionsAsync();
    return permission.granted ? "granted" : permission.canAskAgain ? "undetermined" : "denied";
}

export async function requestReminderNotificationPermission(systemLabels: ReminderSystemLabels) {
    await ensureAndroidChannel(systemLabels);
    await ensureNotificationCategory(systemLabels);
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return requested.granted;
}

export async function cancelReminderNotification(reminderId: string) {
    return serialize(() => Notifications.cancelScheduledNotificationAsync(identifierFor(reminderId)));
}

export async function scheduleReminderNotification({
    reminderId,
    title,
    dueDate,
    dueTime,
    vehicleLabel,
    dueLabel,
    notifyBeforeMinutes = 0,
    notificationTitle,
    notificationBody,
    systemLabels,
}: {
    reminderId: string;
    title: string;
    dueDate: string;
    dueTime?: string | null;
    vehicleLabel: string;
    dueLabel: string;
    notifyBeforeMinutes?: number | null;
    notificationTitle?: string | null;
    notificationBody?: string | null;
    systemLabels: ReminderSystemLabels;
}) {
    return serialize(async () => {
    await ensureAndroidChannel(systemLabels);
    await ensureNotificationCategory(systemLabels);
    const normalizedTime = normalizeReminderTime(dueTime);
    const triggerDate = reminderTriggerDate(dueDate, normalizedTime, notifyBeforeMinutes ?? 0);
    await Notifications.cancelScheduledNotificationAsync(identifierFor(reminderId));
    if (Number.isNaN(triggerDate.getTime()) || triggerDate.getTime() <= Date.now()) return null;

    const content = getReminderNotificationContent({ title, dueDate, dueTime: normalizedTime, vehicleLabel, dueLabel, notificationTitle, notificationBody });

    return Notifications.scheduleNotificationAsync({
        identifier: identifierFor(reminderId),
        content: {
            ...content,
            sound: "default",
            data: { kind: "vehicle-reminder", reminderId, signature: JSON.stringify([content, triggerDate.getTime()]) },
            categoryIdentifier: REMINDER_CATEGORY_ID,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
            channelId: CHANNEL_ID,
        },
    });
    });
}

export async function reconcileReminderNotifications(
    reminders: ReminderRecord[],
    vehicles: VehicleRecord[],
    dueLabel: string,
    vehicleFallback: string,
    systemLabels: ReminderSystemLabels
) {
    return serialize(async () => {
    const granted = (await getReminderNotificationPermission()) === "granted";
    const scheduled = (await Notifications.getAllScheduledNotificationsAsync())
        .filter((notification) => notification.content.data?.kind === "vehicle-reminder");
    const desired = new Set<string>();
    if (granted) {
    await ensureAndroidChannel(systemLabels);
    await ensureNotificationCategory(systemLabels);
    for (const reminder of reminders) {
        if (!reminder.id || !reminder.due_date || reminder.status === "completed") continue;
        const vehicle = vehicles.find((entry) => entry.id === reminder.vehicle_id);
        const vehicleLabel = [vehicle?.vehicle_brand, vehicle?.vehicle_model, vehicle?.vehicle_license_plate]
            .filter(Boolean)
            .join(" · ") || vehicleFallback;
        const date = reminderTriggerDate(reminder.due_date, reminder.due_time, reminder.notify_before_minutes ?? 0);
        if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) continue;
        const content = getReminderNotificationContent({
            title: reminder.title || vehicleFallback,
            dueDate: reminder.due_date,
            dueTime: reminder.due_time,
            vehicleLabel,
            dueLabel,
            notificationTitle: reminder.notification_title,
            notificationBody: reminder.notification_body,
        });
        const identifier = identifierFor(reminder.id);
        desired.add(identifier);
        const signature = JSON.stringify([content, date.getTime()]);
        if (scheduled.some((entry) => entry.identifier === identifier && entry.content.data?.signature === signature)) continue;
        // Replace only changed requests. Unchanged sync snapshots never cancel
        // a pending notification just before its delivery time.
        await Notifications.scheduleNotificationAsync({
            identifier,
            content: { ...content, sound: "default", categoryIdentifier: REMINDER_CATEGORY_ID,
                data: { kind: "vehicle-reminder", reminderId: reminder.id, signature } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
        });
    }
    }
    for (const entry of scheduled) {
        if (!desired.has(entry.identifier)) await Notifications.cancelScheduledNotificationAsync(entry.identifier);
    }
    });
}

export async function sendReminderTestNotification(title: string, body: string, systemLabels: ReminderSystemLabels) {
    await ensureAndroidChannel(systemLabels);
    return Notifications.scheduleNotificationAsync({
        content: { title, body, sound: "default", data: { kind: "notification-test" } },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 3,
            channelId: CHANNEL_ID,
        },
    });
}
