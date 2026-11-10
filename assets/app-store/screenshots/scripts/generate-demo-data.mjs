#!/usr/bin/env node
/**
 * Deterministic, local-only fixture manifest for App Store capture. This file
 * intentionally makes no network requests and never touches a user account.
 * Import its JSON into a disposable staging account only through the app's
 * supported UI or an owner-approved staging seeding procedure.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const captureDate = "2026-11-09";
const vehicles = [
  ["demo-kia", "Kia", "Ceed SW", "2023", "diesel", 59982, "DEMO-KIA-23", "DEMO-KIA-2023-0001"],
  ["demo-toyota", "Toyota", "Corolla Touring Sports", "2022", "hybrid", 42650, "DEMO-TOY-22", "DEMO-TOY-2022-0002"],
  ["demo-golf", "Volkswagen", "Golf", "2021", "petrol", 76320, "DEMO-GOLF-21", "DEMO-GOLF-2021-0003"],
].map(([id, brand, model, year, fuelType, mileage, licensePlate, vin]) => ({ id, brand, model, year, fuelType, mileage, licensePlate, vin }));

const categories = ["fuel", "maintenance", "insurance", "repair", "tyres", "inspection", "cleaning", "other"];
const titles = ["Fuel", "Oil service", "Insurance", "Brake inspection", "Tyres", "Annual inspection", "Car wash", "Road toll"];
const amounts = [72.48, 189.00, 428.40, 154.90, 639.00, 78.00, 16.50, 12.00, 68.21, 95.00];
const dates = ["2026-05-14", "2026-05-28", "2026-06-11", "2026-06-26", "2026-07-09", "2026-07-24", "2026-08-06", "2026-08-21", "2026-09-03", "2026-09-18", "2026-10-02", "2026-10-17", "2026-10-30", "2026-11-02", "2026-11-07"];
const expenses = Array.from({ length: 30 }, (_, index) => ({
  id: `demo-expense-${String(index + 1).padStart(2, "0")}`,
  vehicleId: vehicles[index % vehicles.length].id,
  category: categories[index % categories.length],
  title: titles[index % titles.length],
  amount: amounts[index % amounts.length],
  date: dates[index % dates.length],
  odometer: vehicles[index % vehicles.length].mileage - (29 - index) * 47,
  paymentMethod: "Card",
  notes: "Demo capture data — fictional.",
}));
const reminders = [
  ["Oil change", "maintenance", "2026-12-15", "upcoming", "demo-kia"],
  ["Winter tyre check", "tyres", "2026-11-21", "upcoming", "demo-kia"],
  ["Insurance renewal", "insurance", "2026-12-01", "upcoming", "demo-toyota"],
  ["Annual inspection", "inspection", "2027-01-16", "upcoming", "demo-golf"],
  ["Seasonal maintenance", "maintenance", "2026-12-08", "upcoming", "demo-golf"],
  ["Spring tyre check", "tyres", "2026-04-01", "completed", "demo-toyota"],
].map(([title, category, dueDate, status, vehicleId], index) => ({ id: `demo-reminder-${index + 1}`, title, category, dueDate, status, vehicleId }));
const documents = [
  ["Kia insurance certificate", "insurance", "2027-05-01", "demo-kia"],
  ["Toyota inspection record", "inspection", "2027-06-15", "demo-toyota"],
  ["Golf service invoice", "receipt", "2027-04-10", "demo-golf"],
].map(([title, category, expirationDate, vehicleId], index) => ({ id: `demo-document-${index + 1}`, title, category, expirationDate, vehicleId, fileName: `demo-${index + 1}.pdf` }));
const members = [
  { displayName: "Alex Morgan", role: "owner", status: "active" },
  { displayName: "Jamie Morgan", role: "member", status: "active" },
  { displayName: "Taylor Morgan", role: "member", status: "active" },
];
const data = { captureDate, account: { displayName: "Alex Morgan", email: "autocare-demo@example.invalid" }, vehicles, expenses, reminders, documents, garage: { name: "Morgan Family Garage", kind: "family", members } };
const output = resolve(process.argv[2] || "assets/app-store/screenshots/demo-data.json");
writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${output}: ${vehicles.length} vehicles, ${expenses.length} expenses, ${reminders.length} reminders.`);
