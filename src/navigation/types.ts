import { ExpenseCategory, ExpenseSource } from "../data/models";

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: { email?: string } | undefined;
    ResetPassword: undefined;
};

export type RootStackParamList = {
    Main: undefined;
    VehicleForm: { vehicleId?: string } | undefined;
    VehicleDetail: { vehicleId: string };
    ExpenseForm: { category?: ExpenseCategory; expenseId?: string; source?: ExpenseSource; vehicleId?: string } | undefined;
    ReminderForm: { reminderId?: string; vehicleId?: string } | undefined;
    DocumentForm: { documentId?: string; relatedExpenseId?: string; relatedExpenseType?: string; vehicleId?: string } | undefined;
    Documents: undefined;
    ProfileEdit: undefined;
    Settings: undefined;
    Nearby: undefined;
    Paywall: { source?: "vehicle" | "document" | "export" | "reminder" | "insights" | "family" } | undefined;
    Subscription: undefined;
    Memberships: undefined;
    DataImport: undefined;
    Ownership: undefined;
    Trips: undefined;
    TripForm: { tripId?: string; vehicleId?: string } | undefined;
    ScheduledReports: undefined;
    Checklists: undefined;
    ChecklistRun: { runId: string };
};

export type MainTabParamList = {
    Dashboard: undefined;
    Vehicles: undefined;
    Expenses: undefined;
    Reminders: undefined;
    More: undefined;
};
