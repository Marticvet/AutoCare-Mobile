import * as Notifications from "expo-notifications";
import { reminderTriggerDate, reconcileReminderNotifications } from "../reminderNotifications";
import type { ReminderRecord } from "../../data/models";

jest.mock("expo-notifications", () => ({
    setNotificationHandler: jest.fn(),
    AndroidNotificationPriority: { HIGH: 1 },
    SchedulableTriggerInputTypes: { DATE: "date" },
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
    getAllScheduledNotificationsAsync: jest.fn(async () => []),
    setNotificationCategoryAsync: jest.fn(),
    cancelScheduledNotificationAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(async (request) => request.identifier),
}));

const labels = { channelName: "Reminders", channelDescription: "Vehicle reminders", open: "Open", markComplete: "Complete" };
const reminder = { id: "one", due_date: "2030-11-09", due_time: "09:00", title: "Inspection", status: "pending" } as ReminderRecord;
describe("OS reminder reconciliation", () => {
    beforeEach(() => jest.clearAllMocks());
    it("interprets date and time in local wall time and subtracts lead minutes", () => {
        const date = reminderTriggerDate("2030-11-09", "09:00", 30);
        expect(date.getHours()).toBe(8);
        expect(date.getMinutes()).toBe(30);
        expect(date.getDate()).toBe(9);
    });
    it("schedules offline data once and retains unchanged native requests", async () => {
        await reconcileReminderNotifications([reminder], [], "Due", "Vehicle", labels);
        const request = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0][0];
        jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValueOnce([request as Notifications.NotificationRequest]);
        await reconcileReminderNotifications([reminder], [], "Due", "Vehicle", labels);
        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
        expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    });
    it("replaces edits without duplicating identifiers and cancels removed reminders only", async () => {
        jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValueOnce([
            { identifier: "autocare-reminder-one", content: { data: { kind: "vehicle-reminder", signature: "old" } } },
            { identifier: "autocare-reminder-removed", content: { data: { kind: "vehicle-reminder" } } },
        ] as unknown as Notifications.NotificationRequest[]);
        await reconcileReminderNotifications([reminder], [], "Due", "Vehicle", labels);
        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({ identifier: "autocare-reminder-one" }));
        expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
        expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("autocare-reminder-removed");
    });
    it("does not schedule overdue or completed records", async () => {
        await reconcileReminderNotifications([{ ...reminder, due_date: "2000-01-01" }, { ...reminder, status: "completed" }], [], "Due", "Vehicle", labels);
        expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
    it("recovers after permission is granted on a later reconciliation", async () => {
        jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as Notifications.NotificationPermissionsStatus);
        await reconcileReminderNotifications([reminder], [], "Due", "Vehicle", labels);
        expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
        await reconcileReminderNotifications([reminder], [], "Due", "Vehicle", labels);
        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    });
    it("fails visibly and recovers the serialized queue after native scheduling rejection", async () => {
        jest.mocked(Notifications.scheduleNotificationAsync).mockRejectedValueOnce(new Error("OS scheduling failed"));
        await expect(reconcileReminderNotifications([reminder], [], "Due", "Vehicle", labels)).rejects.toThrow("OS scheduling failed");
        await expect(reconcileReminderNotifications([reminder], [], "Due", "Vehicle", labels)).resolves.toBeUndefined();
    });
});
