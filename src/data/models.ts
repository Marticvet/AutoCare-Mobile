import {
    Reminder,
    ServicePart,
    Vehicle,
    VehicleDocument,
} from "../powersync/AppSchema";

export type ExpenseSource = "fuel" | "service" | "insurance" | "general";
export type ExpenseCategory =
    | "fuel"
    | "service"
    | "insurance"
    | "parking"
    | "toll"
    | "tax"
    | "wash"
    | "repair"
    | "other";

export type ExpenseRecord = {
    id: string;
    source: ExpenseSource;
    category: ExpenseCategory;
    title: string;
    amount: number;
    date: string;
    time: string | null;
    odometer: number | null;
    place: string | null;
    payment_method: string | null;
    notes: string | null;
    vehicle_id: string;
    user_id: string;
    litres: number | null;
    price_per_litre: number | null;
    fuel_type: string | null;
    full_tank: boolean;
    valid_to: string | null;
};

export type PartDraft = {
    id?: string;
    name: string;
    partNumber: string;
    quantity: string;
    unitCost: string;
    installedMileage: string;
    notes: string;
};

export type VehicleDraft = {
    id?: string;
    brand: string;
    model: string;
    trim: string;
    fuelType: string;
    modelYear: string;
    manufactureYear: string;
    type: string;
    licensePlate: string;
    vin: string;
    mileage: string;
    userId: string;
};

export type ExpenseDraft = {
    id?: string;
    source?: ExpenseSource;
    category: ExpenseCategory;
    userId: string;
    vehicleId: string;
    title: string;
    amount: string;
    date: string;
    time: string;
    odometer: string;
    place: string;
    paymentMethod: string;
    notes: string;
    litres: string;
    pricePerLitre: string;
    fuelType: string;
    fullTank: boolean;
    validFrom: string;
    validTo: string;
    provider: string;
    parts: PartDraft[];
};

export type ReminderState = "overdue" | "dueSoon" | "upcoming" | "completed";

export type ReminderDraft = {
    id?: string;
    userId: string;
    vehicleId: string;
    title: string;
    category: string;
    dueDate: string;
    dueTime: string;
    dueMileage: string;
    repeatMonths: string;
    repeatKm: string;
    priority: string;
    notes: string;
};

export type DocumentDraft = {
    id?: string;
    userId: string;
    vehicleId: string;
    title: string;
    category: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    storagePath: string;
    remoteUrl?: string;
    expirationDate: string;
    notes: string;
    relatedExpenseId?: string;
    relatedExpenseType?: string;
};

export type VehicleRecord = Vehicle;
export type ReminderRecord = Reminder;
export type DocumentRecord = VehicleDocument;
export type ServicePartRecord = ServicePart;
