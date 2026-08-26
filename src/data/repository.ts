import {
    ExpenseCategory,
    ExpenseDraft,
    ExpenseRecord,
    ExpenseSource,
    ReminderDraft,
    VehicleDraft,
} from "./models";
import { system } from "../powersync/PowerSync";
import { uuid } from "../powersync/uuid";
import { addMonths, isoDate, isoTime, toNumber } from "../utils/tracking";

const nowIso = () => new Date().toISOString();
const valueOrNull = (value: string) => value.trim() || null;
const numericOrNull = (value: string) => (value.trim() ? toNumber(value) : null);

export const sourceForCategory = (category: ExpenseCategory): ExpenseSource => {
    if (category === "fuel" || category === "service" || category === "insurance") return category;
    return "general";
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
            payment_method: valueOrNull(draft.paymentMethod),
            notes: valueOrNull(draft.notes),
            date: draft.date,
            time: valueOrNull(draft.time),
            created_at: createdAt,
        };
        if (draft.id && previousSource === source) await system.db.updateTable("fuel_expenses").set(row).where("id", "=", id).execute();
        else await system.db.insertInto("fuel_expenses").values(row).execute();
    } else if (source === "service") {
        const row = {
            id,
            user_id: draft.userId,
            selected_vehicle_id: draft.vehicleId,
            type_of_service: valueOrNull(draft.title) ?? "Service",
            cost: rawAmount,
            place: valueOrNull(draft.place),
            location_name: valueOrNull(draft.place),
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
            payment_method: valueOrNull(draft.paymentMethod),
            notes: valueOrNull(draft.notes),
            tags: null,
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
    const emptyParts: import("./models").PartDraft[] = [];
    if (source === "fuel") {
        const row = await system.db.selectFrom("fuel_expenses").selectAll().where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
        if (!row) return null;
        return { id, source, category: "fuel", userId, vehicleId: row.selected_vehicle_id ?? "", title: "Fuel", amount: String(row.total_cost ?? ""), date: row.date ?? isoDate(), time: row.time ?? isoTime(), odometer: String(row.odometer ?? ""), place: row.location_name ?? row.gas_station ?? "", paymentMethod: row.payment_method ?? "", notes: row.notes ?? "", litres: String(row.total_litres ?? ""), pricePerLitre: String(row.price_liter ?? ""), fuelType: row.fuel_type ?? "", fullTank: row.full_tank === "1" || row.full_tank === "true", validFrom: "", validTo: "", provider: "", parts: emptyParts };
    }
    if (source === "service") {
        const row = await system.db.selectFrom("service_expenses").selectAll().where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
        if (!row) return null;
        const parts = await system.db.selectFrom("service_parts").selectAll().where("service_expense_id", "=", id).execute();
        return { id, source, category: "service", userId, vehicleId: row.selected_vehicle_id ?? "", title: row.type_of_service ?? "", amount: String(row.cost ?? ""), date: row.date ?? isoDate(), time: row.time ?? isoTime(), odometer: String(row.odometer ?? ""), place: row.location_name ?? row.place ?? "", paymentMethod: row.payment_method ?? "", notes: row.notes ?? "", litres: "", pricePerLitre: "", fuelType: "", fullTank: false, validFrom: "", validTo: "", provider: "", parts: parts.map((part) => ({ id: part.id ?? undefined, name: part.name ?? "", partNumber: part.part_number ?? "", quantity: String(part.quantity ?? 1), unitCost: String(part.unit_cost ?? ""), installedMileage: String(part.installed_at_mileage ?? ""), notes: part.notes ?? "" })) };
    }
    if (source === "insurance") {
        const row = await system.db.selectFrom("insurance_expenses").selectAll().where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
        if (!row) return null;
        return { id, source, category: "insurance", userId, vehicleId: row.selected_vehicle_id ?? "", title: "Insurance", amount: String(row.cost ?? ""), date: row.valid_from ?? isoDate(), time: isoTime(), odometer: String(row.odometer ?? ""), place: row.provider ?? "", paymentMethod: row.payment_method ?? "", notes: row.notes ?? "", litres: "", pricePerLitre: "", fuelType: "", fullTank: false, validFrom: row.valid_from ?? isoDate(), validTo: row.valid_to ?? "", provider: row.provider ?? "", parts: emptyParts };
    }
    const row = await system.db.selectFrom("general_expenses").selectAll().where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
    if (!row) return null;
    return { id, source, category: (row.category as ExpenseCategory) ?? "other", userId, vehicleId: row.vehicle_id ?? "", title: row.title ?? "", amount: String(row.amount ?? ""), date: row.date ?? isoDate(), time: row.time ?? isoTime(), odometer: String(row.odometer ?? ""), place: row.place ?? "", paymentMethod: row.payment_method ?? "", notes: row.notes ?? "", litres: "", pricePerLitre: "", fuelType: "", fullTank: false, validFrom: "", validTo: "", provider: "", parts: emptyParts };
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
