import { ExpenseCategory, ExpenseSource } from "../data/models";

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
};

export type MainTabParamList = {
    Dashboard: undefined;
    Vehicles: undefined;
    Expenses: undefined;
    Reminders: undefined;
    More: undefined;
};
