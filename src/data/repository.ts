import {
    ExpenseCategory,
    ExpenseDraft,
    ExpenseRecord,
    ExpenseSource,
    ChecklistTemplateDraft,
    ReportScheduleDraft,
    ReminderDraft,
    TripDraft,
    VehicleBudgetDraft,
    VehicleDraft,
} from "./models";
import { system } from "../powersync/PowerSync";
import { uuid } from "../powersync/uuid";
import { addMonths, isoDate, isoTime, toNumber } from "../utils/tracking";

const nowIso = () => new Date().toISOString();
const valueOrNull = (value: string) => value.trim() || null;
const numericOrNull = (value: string) => (value.trim() ? toNumber(value) : null);

export const sourceForCategory = (category: ExpenseCategory): ExpenseSource => {
    if (category === "fuel" || category === "charging" || category === "service" || category === "insurance") return category;
    return "general";
};

const emptyExpenseExtras = {
    latitude: "",
    longitude: "",
    energyKwh: "",
    pricePerKwh: "",
    batteryStartPercent: "",
    batteryEndPercent: "",
    chargerType: "",
    chargingSpeedKw: "",
    efficiencyKwhPer100Km: "",
};

export async function saveVehicle(draft: VehicleDraft) {
    await system.initDatabase();
    const id = draft.id ?? uuid();
    const row = {
        id,
        created_at: nowIso(),
        vehicle_brand: draft.brand.trim(),
        vehicle_model: draft.model.trim(),
        vehicle_trim: valueOrNull(draft.trim),
        vehicle_fuel_type: valueOrNull(draft.fuelType),
        vehicle_model_year: toNumber(draft.modelYear),
        vehicle_year_of_manufacture: toNumber(draft.manufactureYear || draft.modelYear),
        vehicle_car_type: draft.type.trim(),
        vehicle_license_plate: draft.licensePlate.trim().toUpperCase(),
        vehicle_identification_number: draft.vin.trim().toUpperCase(),
        current_mileage: toNumber(draft.mileage),
        user_id: draft.userId,
    };

    if (draft.id) {
        const { id: _id, created_at: _createdAt, ...updates } = row;
        await system.db.updateTable("vehicles").set(updates).where("id", "=", id).where("user_id", "=", draft.userId).execute();
    } else {
        await system.db.insertInto("vehicles").values(row).execute();
        await system.db
            .updateTable("profiles")
            .set({ selected_vehicle_id: id })
            .where("id", "=", draft.userId)
            .where("selected_vehicle_id", "is", null)
            .execute();
    }

    return id;
}

export async function selectVehicle(userId: string, vehicleId: string) {
    await system.db
        .updateTable("profiles")
        .set({ selected_vehicle_id: vehicleId })
        .where("id", "=", userId)
        .execute();
}

export async function deleteVehicle(userId: string, vehicleId: string) {
    const documents = await system.db
        .selectFrom("vehicle_documents")
        .selectAll()
        .where("user_id", "=", userId)
        .where("vehicle_id", "=", vehicleId)
        .execute();
    await system.db.transaction().execute(async (transaction) => {
        const checklistRuns = await transaction.selectFrom("checklist_runs").select("id").where("user_id", "=", userId).where("vehicle_id", "=", vehicleId).execute();
        for (const run of checklistRuns) {
            await transaction.deleteFrom("checklist_run_items").where("user_id", "=", userId).where("run_id", "=", run.id).execute();
        }
        await transaction.deleteFrom("checklist_runs").where("user_id", "=", userId).where("vehicle_id", "=", vehicleId).execute();
        await transaction.deleteFrom("trips").where("user_id", "=", userId).where("vehicle_id", "=", vehicleId).execute();
        await transaction.deleteFrom("vehicle_budgets").where("user_id", "=", userId).where("vehicle_id", "=", vehicleId).execute();
        await transaction.deleteFrom("charging_expenses").where("user_id", "=", userId).where("selected_vehicle_id", "=", vehicleId).execute();
        await transaction.deleteFrom("service_parts").where("user_id", "=", userId).where("vehicle_id", "=", vehicleId).execute();
        await transaction.deleteFrom("vehicle_documents").where("user_id", "=", userId).where("vehicle_id", "=", vehicleId).execute();
        await transaction.deleteFrom("reminders").where("user_id", "=", userId).where("vehicle_id", "=", vehicleId).execute();
        await transaction.deleteFrom("general_expenses").where("user_id", "=", userId).where("vehicle_id", "=", vehicleId).execute();
        await transaction.deleteFrom("fuel_expenses").where("user_id", "=", userId).where("selected_vehicle_id", "=", vehicleId).execute();
        await transaction.deleteFrom("insurance_expenses").where("user_id", "=", userId).where("selected_vehicle_id", "=", vehicleId).execute();
        await transaction.deleteFrom("service_expenses").where("user_id", "=", userId).where("selected_vehicle_id", "=", vehicleId).execute();
        await transaction.deleteFrom("vehicles").where("user_id", "=", userId).where("id", "=", vehicleId).execute();
        await transaction.updateTable("profiles").set({ selected_vehicle_id: null }).where("id", "=", userId).where("selected_vehicle_id", "=", vehicleId).execute();
    });
    return documents;
}

async function deleteExpenseFromSource(source: ExpenseSource, id: string, userId: string) {
    const table = {
        fuel: "fuel_expenses",
        charging: "charging_expenses",
        service: "service_expenses",
        insurance: "insurance_expenses",
        general: "general_expenses",
    }[source];

    if (source === "service") {
        await system.db.deleteFrom("service_parts").where("service_expense_id", "=", id).where("user_id", "=", userId).execute();
    }

    await (system.db.deleteFrom(table as any) as any).where("id", "=", id).where("user_id", "=", userId).execute();
}

export async function saveExpense(draft: ExpenseDraft) {
    await system.initDatabase();
    const id = draft.id ?? uuid();
    const source = sourceForCategory(draft.category);
    const previousSource = draft.source;
    const createdAt = nowIso();
    const odometer = numericOrNull(draft.odometer);
    const rawAmount = toNumber(draft.amount);

    if (draft.id && previousSource && previousSource !== source) {
        await deleteExpenseFromSource(previousSource, id, draft.userId);
    }

    if (source === "fuel") {
        const litres = toNumber(draft.litres);
        const price = toNumber(draft.pricePerLitre);
        const amount = rawAmount || litres * price;
        const row = {
            id,
            user_id: draft.userId,
            selected_vehicle_id: draft.vehicleId,
            odometer,
            fuel_type: valueOrNull(draft.fuelType),
            price_liter: price || (litres > 0 ? amount / litres : null),
            total_cost: amount,
            total_litres: litres,
            full_tank: draft.fullTank ? "1" : "0",
            gas_station: valueOrNull(draft.place),
            location_name: valueOrNull(draft.place),
            latitude: numericOrNull(draft.latitude),
            longitude: numericOrNull(draft.longitude),
            import_batch_id: draft.importBatchId ?? null,
            external_id: draft.externalId ?? null,
            payment_method: valueOrNull(draft.paymentMethod),
            notes: valueOrNull(draft.notes),
            date: draft.date,
            time: valueOrNull(draft.time),
            created_at: createdAt,
        };
        if (draft.id && previousSource === source) await system.db.updateTable("fuel_expenses").set(row).where("id", "=", id).execute();
        else await system.db.insertInto("fuel_expenses").values(row).execute();
    } else if (source === "charging") {
        const energyKwh = toNumber(draft.energyKwh);
        const pricePerKwh = toNumber(draft.pricePerKwh);
        const amount = rawAmount || energyKwh * pricePerKwh;
        const row = {
            id,
            user_id: draft.userId,
            selected_vehicle_id: draft.vehicleId,
            energy_kwh: energyKwh,
            price_per_kwh: pricePerKwh || (energyKwh > 0 ? amount / energyKwh : null),
            total_cost: amount,
            battery_start_percent: numericOrNull(draft.batteryStartPercent),
            battery_end_percent: numericOrNull(draft.batteryEndPercent),
            charger_type: valueOrNull(draft.chargerType),
            charging_speed_kw: numericOrNull(draft.chargingSpeedKw),
            efficiency_kwh_per_100km: numericOrNull(draft.efficiencyKwhPer100Km),
            odometer,
            date: draft.date,
            time: valueOrNull(draft.time),
            location_name: valueOrNull(draft.place),
            latitude: numericOrNull(draft.latitude),
            longitude: numericOrNull(draft.longitude),
            payment_method: valueOrNull(draft.paymentMethod),
            notes: valueOrNull(draft.notes),
            import_batch_id: draft.importBatchId ?? null,
            external_id: draft.externalId ?? null,
            created_at: createdAt,
        };
        if (draft.id && previousSource === source) await system.db.updateTable("charging_expenses").set(row).where("id", "=", id).execute();
        else await system.db.insertInto("charging_expenses").values(row).execute();
    } else if (source === "service") {
        const row = {
            id,
            user_id: draft.userId,
            selected_vehicle_id: draft.vehicleId,
            type_of_service: valueOrNull(draft.title) ?? "Service",
            cost: rawAmount,
            place: valueOrNull(draft.place),
            location_name: valueOrNull(draft.place),
            latitude: numericOrNull(draft.latitude),
            longitude: numericOrNull(draft.longitude),
            import_batch_id: draft.importBatchId ?? null,
            external_id: draft.externalId ?? null,
            payment_method: valueOrNull(draft.paymentMethod),
            notes: valueOrNull(draft.notes),
            date: draft.date,
            time: valueOrNull(draft.time),
            odometer,
            created_at: createdAt,
        };
        if (draft.id && previousSource === source) await system.db.updateTable("service_expenses").set(row).where("id", "=", id).execute();
        else await system.db.insertInto("service_expenses").values(row).execute();

        await system.db.deleteFrom("service_parts").where("service_expense_id", "=", id).execute();
        const parts = draft.parts
            .filter((part) => part.name.trim())
            .map((part) => ({
                id: part.id ?? uuid(),
                user_id: draft.userId,
                vehicle_id: draft.vehicleId,
                service_expense_id: id,
                name: part.name.trim(),
                part_number: valueOrNull(part.partNumber),
                quantity: toNumber(part.quantity) || 1,
                unit_cost: toNumber(part.unitCost),
                installed_at_mileage: numericOrNull(part.installedMileage || draft.odometer),
                notes: valueOrNull(part.notes),
                created_at: createdAt,
            }));
        if (parts.length) await system.db.insertInto("service_parts").values(parts).execute();
    } else if (source === "insurance") {
        const row = {
            id,
            user_id: draft.userId,
            selected_vehicle_id: draft.vehicleId,
            odometer,
            cost: rawAmount,
            valid_from: draft.validFrom || draft.date,
            valid_to: valueOrNull(draft.validTo),
            provider: valueOrNull(draft.provider || draft.place),
            location_name: valueOrNull(draft.place),
            latitude: numericOrNull(draft.latitude),
            longitude: numericOrNull(draft.longitude),
            import_batch_id: draft.importBatchId ?? null,
            external_id: draft.externalId ?? null,
            payment_method: valueOrNull(draft.paymentMethod),
            notes: valueOrNull(draft.notes),
            created_at: createdAt,
        };
        if (draft.id && previousSource === source) await system.db.updateTable("insurance_expenses").set(row).where("id", "=", id).execute();
        else await system.db.insertInto("insurance_expenses").values(row).execute();
    } else {
        const row = {
            id,
            user_id: draft.userId,
            vehicle_id: draft.vehicleId,
            category: draft.category,
            title: valueOrNull(draft.title) ?? draft.category,
            amount: rawAmount,
            odometer,
            date: draft.date,
            time: valueOrNull(draft.time),
            place: valueOrNull(draft.place),
            location_name: valueOrNull(draft.place),
            latitude: numericOrNull(draft.latitude),
            longitude: numericOrNull(draft.longitude),
            payment_method: valueOrNull(draft.paymentMethod),
            notes: valueOrNull(draft.notes),
            tags: null,
            import_batch_id: draft.importBatchId ?? null,
            external_id: draft.externalId ?? null,
            created_at: createdAt,
        };
        if (draft.id && previousSource === source) await system.db.updateTable("general_expenses").set(row).where("id", "=", id).execute();
        else await system.db.insertInto("general_expenses").values(row).execute();
    }

    if (odometer) {
        const vehicle = await system.db.selectFrom("vehicles").select("current_mileage").where("id", "=", draft.vehicleId).executeTakeFirst();
        if ((vehicle?.current_mileage ?? 0) < odometer) {
            await system.db.updateTable("vehicles").set({ current_mileage: odometer }).where("id", "=", draft.vehicleId).execute();
        }
    }

    return { id, source };
}

export async function deleteExpense(expense: Pick<ExpenseRecord, "id" | "source" | "user_id">) {
    const documents = await system.db
        .selectFrom("vehicle_documents")
        .selectAll()
        .where("related_expense_id", "=", expense.id)
        .where("user_id", "=", expense.user_id)
        .execute();
    await deleteExpenseFromSource(expense.source, expense.id, expense.user_id);
    await system.db.deleteFrom("vehicle_documents").where("related_expense_id", "=", expense.id).where("user_id", "=", expense.user_id).execute();
    return documents;
}

export async function loadExpense(id: string, source: ExpenseSource, userId: string): Promise<ExpenseDraft | null> {
    const baseDraft = (category: ExpenseCategory, vehicleId: string): ExpenseDraft => ({
        id,
        source,
        category,
        userId,
        vehicleId,
        title: "",
        amount: "",
        date: isoDate(),
        time: isoTime(),
        odometer: "",
        place: "",
        paymentMethod: "",
        notes: "",
        litres: "",
        pricePerLitre: "",
        fuelType: "",
        fullTank: false,
        validFrom: "",
        validTo: "",
        provider: "",
        parts: [],
        ...emptyExpenseExtras,
    });
    if (source === "fuel") {
        const row = await system.db.selectFrom("fuel_expenses").selectAll().where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
        if (!row) return null;
        return { ...baseDraft("fuel", row.selected_vehicle_id ?? ""), title: "Fuel", amount: String(row.total_cost ?? ""), date: row.date ?? isoDate(), time: row.time ?? isoTime(), odometer: String(row.odometer ?? ""), place: row.location_name ?? row.gas_station ?? "", latitude: String(row.latitude ?? ""), longitude: String(row.longitude ?? ""), paymentMethod: row.payment_method ?? "", notes: row.notes ?? "", litres: String(row.total_litres ?? ""), pricePerLitre: String(row.price_liter ?? ""), fuelType: row.fuel_type ?? "", fullTank: row.full_tank === "1" || row.full_tank === "true", importBatchId: row.import_batch_id ?? undefined, externalId: row.external_id ?? undefined };
    }
    if (source === "charging") {
        const row = await system.db.selectFrom("charging_expenses").selectAll().where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
        if (!row) return null;
        return { ...baseDraft("charging", row.selected_vehicle_id ?? ""), title: "EV charging", amount: String(row.total_cost ?? ""), date: row.date ?? isoDate(), time: row.time ?? isoTime(), odometer: String(row.odometer ?? ""), place: row.location_name ?? "", latitude: String(row.latitude ?? ""), longitude: String(row.longitude ?? ""), paymentMethod: row.payment_method ?? "", notes: row.notes ?? "", energyKwh: String(row.energy_kwh ?? ""), pricePerKwh: String(row.price_per_kwh ?? ""), batteryStartPercent: String(row.battery_start_percent ?? ""), batteryEndPercent: String(row.battery_end_percent ?? ""), chargerType: row.charger_type ?? "", chargingSpeedKw: String(row.charging_speed_kw ?? ""), efficiencyKwhPer100Km: String(row.efficiency_kwh_per_100km ?? ""), importBatchId: row.import_batch_id ?? undefined, externalId: row.external_id ?? undefined };
    }
    if (source === "service") {
        const row = await system.db.selectFrom("service_expenses").selectAll().where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
        if (!row) return null;
        const parts = await system.db.selectFrom("service_parts").selectAll().where("service_expense_id", "=", id).execute();
        return { ...baseDraft("service", row.selected_vehicle_id ?? ""), title: row.type_of_service ?? "", amount: String(row.cost ?? ""), date: row.date ?? isoDate(), time: row.time ?? isoTime(), odometer: String(row.odometer ?? ""), place: row.location_name ?? row.place ?? "", latitude: String(row.latitude ?? ""), longitude: String(row.longitude ?? ""), paymentMethod: row.payment_method ?? "", notes: row.notes ?? "", importBatchId: row.import_batch_id ?? undefined, externalId: row.external_id ?? undefined, parts: parts.map((part) => ({ id: part.id ?? undefined, name: part.name ?? "", partNumber: part.part_number ?? "", quantity: String(part.quantity ?? 1), unitCost: String(part.unit_cost ?? ""), installedMileage: String(part.installed_at_mileage ?? ""), notes: part.notes ?? "" })) };
    }
    if (source === "insurance") {
        const row = await system.db.selectFrom("insurance_expenses").selectAll().where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
        if (!row) return null;
        return { ...baseDraft("insurance", row.selected_vehicle_id ?? ""), title: "Insurance", amount: String(row.cost ?? ""), date: row.valid_from ?? isoDate(), time: isoTime(), odometer: String(row.odometer ?? ""), place: row.location_name ?? row.provider ?? "", latitude: String(row.latitude ?? ""), longitude: String(row.longitude ?? ""), paymentMethod: row.payment_method ?? "", notes: row.notes ?? "", validFrom: row.valid_from ?? isoDate(), validTo: row.valid_to ?? "", provider: row.provider ?? "", importBatchId: row.import_batch_id ?? undefined, externalId: row.external_id ?? undefined };
    }
    const row = await system.db.selectFrom("general_expenses").selectAll().where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
    if (!row) return null;
    return { ...baseDraft((row.category as ExpenseCategory) ?? "other", row.vehicle_id ?? ""), title: row.title ?? "", amount: String(row.amount ?? ""), date: row.date ?? isoDate(), time: row.time ?? isoTime(), odometer: String(row.odometer ?? ""), place: row.location_name ?? row.place ?? "", latitude: String(row.latitude ?? ""), longitude: String(row.longitude ?? ""), paymentMethod: row.payment_method ?? "", notes: row.notes ?? "", importBatchId: row.import_batch_id ?? undefined, externalId: row.external_id ?? undefined };
}

export async function saveReminder(draft: ReminderDraft) {
    const id = draft.id ?? uuid();
    const row = {
        id,
        user_id: draft.userId,
        vehicle_id: draft.vehicleId,
        title: draft.title.trim(),
        category: draft.category,
        due_date: valueOrNull(draft.dueDate),
        due_time: draft.dueTime.trim() || "09:00",
        due_mileage: numericOrNull(draft.dueMileage),
        repeat_months: numericOrNull(draft.repeatMonths),
        repeat_km: numericOrNull(draft.repeatKm),
        priority: draft.priority,
        notify_before_minutes: Math.max(0, Math.round(toNumber(draft.notifyBeforeMinutes))),
        notification_title: valueOrNull(draft.notificationTitle),
        notification_body: valueOrNull(draft.notificationBody),
        status: "active",
        notes: valueOrNull(draft.notes),
        completed_at: null,
        created_at: nowIso(),
        related_document_id: null,
    };
    if (draft.id) await system.db.updateTable("reminders").set(row).where("id", "=", id).where("user_id", "=", draft.userId).execute();
    else await system.db.insertInto("reminders").values(row).execute();
    return id;
}

export async function completeReminder(reminderId: string, userId: string) {
    const reminder = await system.db.selectFrom("reminders").selectAll().where("id", "=", reminderId).where("user_id", "=", userId).executeTakeFirst();
    if (!reminder) return;
    await system.db.updateTable("reminders").set({ status: "completed", completed_at: nowIso() }).where("id", "=", reminderId).execute();

    if ((reminder.repeat_months ?? 0) > 0 || (reminder.repeat_km ?? 0) > 0) {
        await system.db.insertInto("reminders").values({
            ...reminder,
            id: uuid(),
            due_date: reminder.due_date && reminder.repeat_months ? addMonths(reminder.due_date, reminder.repeat_months) : reminder.due_date,
            due_mileage: reminder.due_mileage !== null && reminder.repeat_km ? reminder.due_mileage + reminder.repeat_km : reminder.due_mileage,
            status: "active",
            completed_at: null,
            created_at: nowIso(),
        }).execute();
    }
}

export async function reopenReminder(reminderId: string, userId: string) {
    await system.db.updateTable("reminders").set({ status: "active", completed_at: null }).where("id", "=", reminderId).where("user_id", "=", userId).execute();
}

export async function deleteReminder(reminderId: string, userId: string) {
    await system.db.deleteFrom("reminders").where("id", "=", reminderId).where("user_id", "=", userId).execute();
}

export async function saveDocument(draft: import("./models").DocumentDraft) {
    const id = draft.id ?? uuid();
    const row = {
        id,
        user_id: draft.userId,
        vehicle_id: draft.vehicleId,
        title: draft.title.trim(),
        category: draft.category,
        file_name: valueOrNull(draft.fileName),
        mime_type: valueOrNull(draft.mimeType),
        file_size: draft.fileSize || null,
        storage_path: valueOrNull(draft.storagePath),
        remote_url: valueOrNull(draft.remoteUrl ?? ""),
        expiration_date: valueOrNull(draft.expirationDate),
        notes: valueOrNull(draft.notes),
        created_at: nowIso(),
        related_expense_id: valueOrNull(draft.relatedExpenseId ?? ""),
        related_expense_type: valueOrNull(draft.relatedExpenseType ?? ""),
    };
    const existing = await system.db
        .selectFrom("vehicle_documents")
        .select("id")
        .where("id", "=", id)
        .where("user_id", "=", draft.userId)
        .executeTakeFirst();
    if (existing) await system.db.updateTable("vehicle_documents").set(row).where("id", "=", id).where("user_id", "=", draft.userId).execute();
    else await system.db.insertInto("vehicle_documents").values(row).execute();

    const expirationReminder = await system.db
        .selectFrom("reminders")
        .select("id")
        .where("related_document_id", "=", id)
        .where("user_id", "=", draft.userId)
        .executeTakeFirst();
    if (draft.expirationDate) {
        const reminderRow = {
            id: expirationReminder?.id ?? uuid(),
            user_id: draft.userId,
            vehicle_id: draft.vehicleId,
            title: `${draft.title.trim()} expiration`,
            category: "document",
            due_date: draft.expirationDate,
            due_time: "09:00",
            due_mileage: null,
            repeat_months: null,
            repeat_km: null,
            priority: "high",
            notify_before_minutes: 0,
            notification_title: null,
            notification_body: null,
            status: "active",
            notes: null,
            completed_at: null,
            created_at: nowIso(),
            related_document_id: id,
        };
        if (expirationReminder) await system.db.updateTable("reminders").set(reminderRow).where("id", "=", expirationReminder.id).execute();
        else await system.db.insertInto("reminders").values(reminderRow).execute();
    } else if (expirationReminder) {
        await system.db.deleteFrom("reminders").where("id", "=", expirationReminder.id).execute();
    }
    return id;
}

export async function deleteDocument(documentId: string, userId: string) {
    await system.db.deleteFrom("reminders").where("related_document_id", "=", documentId).where("user_id", "=", userId).execute();
    await system.db.deleteFrom("vehicle_documents").where("id", "=", documentId).where("user_id", "=", userId).execute();
}

export async function saveVehicleBudget(draft: VehicleBudgetDraft) {
    const existing = await system.db
        .selectFrom("vehicle_budgets")
        .select("id")
        .where("user_id", "=", draft.userId)
        .where("vehicle_id", "=", draft.vehicleId)
        .executeTakeFirst();
    const id = draft.id ?? existing?.id ?? uuid();
    const row = {
        id,
        user_id: draft.userId,
        vehicle_id: draft.vehicleId,
        monthly_budget: numericOrNull(draft.monthlyBudget),
        purchase_price: numericOrNull(draft.purchasePrice),
        current_value: numericOrNull(draft.currentValue),
        purchase_date: valueOrNull(draft.purchaseDate),
        annual_depreciation_percent: numericOrNull(draft.annualDepreciationPercent),
        created_at: nowIso(),
        updated_at: nowIso(),
    };
    if (existing || draft.id) await system.db.updateTable("vehicle_budgets").set(row).where("id", "=", id).where("user_id", "=", draft.userId).execute();
    else await system.db.insertInto("vehicle_budgets").values(row).execute();
    return id;
}

export async function saveTrip(draft: TripDraft) {
    const id = draft.id ?? uuid();
    const startAt = new Date(`${draft.startDate}T${draft.startTime || "00:00"}:00`).toISOString();
    const endAt = draft.endDate ? new Date(`${draft.endDate}T${draft.endTime || "00:00"}:00`).toISOString() : null;
    const startOdometer = numericOrNull(draft.startOdometer);
    const endOdometer = numericOrNull(draft.endOdometer);
    const calculatedDistance = startOdometer !== null && endOdometer !== null && endOdometer >= startOdometer
        ? endOdometer - startOdometer
        : 0;
    const row = {
        id,
        user_id: draft.userId,
        vehicle_id: draft.vehicleId,
        purpose: draft.purpose,
        title: valueOrNull(draft.title),
        start_at: startAt,
        end_at: endAt,
        start_odometer: startOdometer,
        end_odometer: endOdometer,
        distance_km: toNumber(draft.distanceKm) || calculatedDistance,
        origin: valueOrNull(draft.origin),
        destination: valueOrNull(draft.destination),
        origin_latitude: null,
        origin_longitude: null,
        destination_latitude: null,
        destination_longitude: null,
        reimbursable_rate: numericOrNull(draft.reimbursableRate),
        notes: valueOrNull(draft.notes),
        created_at: nowIso(),
    };
    if (draft.id) await system.db.updateTable("trips").set(row).where("id", "=", id).where("user_id", "=", draft.userId).execute();
    else await system.db.insertInto("trips").values(row).execute();
    return id;
}

export async function deleteTrip(id: string, userId: string) {
    await system.db.deleteFrom("trips").where("id", "=", id).where("user_id", "=", userId).execute();
}

function nextReportRun(draft: ReportScheduleDraft) {
    const now = new Date();
    const [hours, minutes] = (draft.deliveryTime || "09:00").split(":").map(Number);
    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setHours(hours || 0, minutes || 0, 0, 0);
    if (draft.frequency === "weekly") {
        const targetDay = Math.min(6, Math.max(0, Math.round(toNumber(draft.dayOfWeek))));
        let days = (targetDay - next.getDay() + 7) % 7;
        if (days === 0 && next <= now) days = 7;
        next.setDate(next.getDate() + days);
    } else {
        const targetDate = Math.min(28, Math.max(1, Math.round(toNumber(draft.dayOfMonth)) || 1));
        next.setDate(targetDate);
        if (next <= now) next.setMonth(next.getMonth() + 1);
    }
    return next.toISOString();
}

export async function saveReportSchedule(draft: ReportScheduleDraft) {
    const id = draft.id ?? uuid();
    const row = {
        id,
        user_id: draft.userId,
        vehicle_id: valueOrNull(draft.vehicleId),
        name: draft.name.trim(),
        frequency: draft.frequency,
        format: draft.format,
        delivery_email: draft.deliveryEmail.trim().toLowerCase(),
        day_of_week: draft.frequency === "weekly" ? Math.round(toNumber(draft.dayOfWeek)) : null,
        day_of_month: draft.frequency === "monthly" ? Math.round(toNumber(draft.dayOfMonth)) : null,
        delivery_time: draft.deliveryTime || "09:00",
        timezone: draft.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        enabled: draft.enabled ? 1 : 0,
        next_run_at: draft.enabled ? nextReportRun(draft) : null,
        last_sent_at: null,
        created_at: nowIso(),
        updated_at: nowIso(),
    };
    if (draft.id) await system.db.updateTable("report_schedules").set(row).where("id", "=", id).where("user_id", "=", draft.userId).execute();
    else await system.db.insertInto("report_schedules").values(row).execute();
    return id;
}

export async function deleteReportSchedule(id: string, userId: string) {
    await system.db.deleteFrom("report_schedules").where("id", "=", id).where("user_id", "=", userId).execute();
}

export async function saveChecklistTemplate(draft: ChecklistTemplateDraft) {
    const id = draft.id ?? uuid();
    const createdAt = nowIso();
    const row = {
        id,
        user_id: draft.userId,
        name: draft.name.trim(),
        description: valueOrNull(draft.description),
        vehicle_type: valueOrNull(draft.vehicleType),
        is_default: 0,
        active: 1,
        created_at: createdAt,
        updated_at: createdAt,
    };
    if (draft.id) await system.db.updateTable("checklist_templates").set(row).where("id", "=", id).where("user_id", "=", draft.userId).execute();
    else await system.db.insertInto("checklist_templates").values(row).execute();
    await system.db.deleteFrom("checklist_template_items").where("template_id", "=", id).where("user_id", "=", draft.userId).execute();
    const items = draft.items.filter((item) => item.label.trim()).map((item, index) => ({
        id: item.id ?? uuid(),
        user_id: draft.userId,
        template_id: id,
        label: item.label.trim(),
        required: item.required ? 1 : 0,
        sort_order: item.sortOrder ?? index,
        created_at: createdAt,
    }));
    if (items.length) await system.db.insertInto("checklist_template_items").values(items).execute();
    return id;
}

export async function ensureDefaultChecklist(userId: string) {
    const existing = await system.db.selectFrom("checklist_templates").select("id").where("user_id", "=", userId).where("active", "=", 1).executeTakeFirst();
    if (existing) return existing.id;
    return saveChecklistTemplate({
        userId,
        name: "Pre-trip inspection",
        description: "A quick safety check before driving.",
        vehicleType: "",
        items: [
            "Tyres and visible damage",
            "Lights and indicators",
            "Windows and mirrors",
            "Fluid leaks",
            "Brakes and steering",
            "Seat belts and safety equipment",
            "Fuel or charge level",
            "Documents present",
        ].map((label, index) => ({ label, required: true, sortOrder: index })),
    });
}

export async function startChecklistRun(userId: string, vehicleId: string, templateId: string, assignedUserId: string, driverName: string) {
    const id = uuid();
    const now = nowIso();
    const templateItems = await system.db.selectFrom("checklist_template_items").selectAll().where("user_id", "=", userId).where("template_id", "=", templateId).orderBy("sort_order").execute();
    await system.db.insertInto("checklist_runs").values({
        id,
        user_id: userId,
        template_id: templateId,
        vehicle_id: vehicleId,
        assigned_user_id: valueOrNull(assignedUserId),
        status: "in_progress",
        driver_name: valueOrNull(driverName),
        damage_notes: null,
        signature_name: null,
        signature_storage_path: null,
        started_at: now,
        completed_at: null,
        created_at: now,
    }).execute();
    const runItems = templateItems.map((item) => ({
        id: uuid(),
        user_id: userId,
        run_id: id,
        template_item_id: item.id,
        label: item.label,
        result: "unchecked",
        notes: null,
        photo_storage_path: null,
        sort_order: item.sort_order,
        created_at: now,
    }));
    if (runItems.length) await system.db.insertInto("checklist_run_items").values(runItems).execute();
    return id;
}

export async function setChecklistItemResult(itemId: string, userId: string, result: "pass" | "fail" | "not_applicable") {
    await system.db.updateTable("checklist_run_items").set({ result }).where("id", "=", itemId).where("user_id", "=", userId).execute();
}

export async function completeChecklistRun(runId: string, userId: string, signatureName: string, damageNotes: string) {
    const items = await system.db.selectFrom("checklist_run_items").select("result").where("run_id", "=", runId).where("user_id", "=", userId).execute();
    if (items.some((item) => item.result === "unchecked")) throw new Error("Complete every checklist item first.");
    const attentionRequired = items.some((item) => item.result === "fail");
    await system.db.updateTable("checklist_runs").set({
        status: attentionRequired ? "attention_required" : "passed",
        signature_name: valueOrNull(signatureName),
        damage_notes: valueOrNull(damageNotes),
        completed_at: nowIso(),
    }).where("id", "=", runId).where("user_id", "=", userId).execute();
}
