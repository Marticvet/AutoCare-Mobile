import {
    ChecklistRun,
    ChecklistRunItem,
    ChecklistTemplate,
    ChecklistTemplateItem,
    ReportSchedule,
    Reminder,
    ServicePart,
    Trip,
    Vehicle,
    VehicleBudget,
    VehicleDocument,
} from "../powersync/AppSchema";

export type ExpenseSource = "fuel" | "charging" | "service" | "insurance" | "general";
export type ExpenseCategory =
    | "fuel"
    | "charging"
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
    latitude: number | null;
    longitude: number | null;
    energy_kwh: number | null;
    price_per_kwh: number | null;
    battery_start_percent: number | null;
    battery_end_percent: number | null;
    charger_type: string | null;
    charging_speed_kw: number | null;
    efficiency_kwh_per_100km: number | null;
    import_batch_id: string | null;
    external_id: string | null;
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
    latitude: string;
    longitude: string;
    energyKwh: string;
    pricePerKwh: string;
    batteryStartPercent: string;
    batteryEndPercent: string;
    chargerType: string;
    chargingSpeedKw: string;
    efficiencyKwhPer100Km: string;
    importBatchId?: string;
    externalId?: string;
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
    notifyBeforeMinutes: string;
    notificationTitle: string;
    notificationBody: string;
    notes: string;
};

export type VehicleBudgetDraft = {
    id?: string;
    userId: string;
    vehicleId: string;
    monthlyBudget: string;
    purchasePrice: string;
    currentValue: string;
    purchaseDate: string;
    annualDepreciationPercent: string;
};

export type TripDraft = {
    id?: string;
    userId: string;
    vehicleId: string;
    purpose: "business" | "personal" | "commute" | "other";
    title: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    startOdometer: string;
    endOdometer: string;
    distanceKm: string;
    origin: string;
    destination: string;
    reimbursableRate: string;
    notes: string;
};

export type ReportScheduleDraft = {
    id?: string;
    userId: string;
    vehicleId: string;
    name: string;
    frequency: "weekly" | "monthly";
    format: "csv" | "pdf";
    deliveryEmail: string;
    dayOfWeek: string;
    dayOfMonth: string;
    deliveryTime: string;
    timezone: string;
    enabled: boolean;
};

export type ChecklistItemDraft = {
    id?: string;
    label: string;
    required: boolean;
    sortOrder: number;
};

export type ChecklistTemplateDraft = {
    id?: string;
    userId: string;
    name: string;
    description: string;
    vehicleType: string;
    isDefault?: boolean;
    items: ChecklistItemDraft[];
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
export type VehicleBudgetRecord = VehicleBudget;
export type TripRecord = Trip;
export type ReportScheduleRecord = ReportSchedule;
export type ChecklistTemplateRecord = ChecklistTemplate;
export type ChecklistTemplateItemRecord = ChecklistTemplateItem;
export type ChecklistRunRecord = ChecklistRun;
export type ChecklistRunItemRecord = ChecklistRunItem;
