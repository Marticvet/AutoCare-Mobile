import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

type Schedule = {
    id: string;
    user_id: string;
    vehicle_id: string | null;
    name: string;
    frequency: "weekly" | "monthly";
    format: "csv" | "pdf";
    delivery_email: string;
    next_run_at: string | null;
};

type ExpenseRow = { date: string; category: string; title: string; amount: number; vehicle_id: string; place?: string | null };

Deno.serve(async (request) => {
    if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
    const cronSecret = Deno.env.get("REPORT_CRON_SECRET");
    const suppliedSecret = request.headers.get("x-cron-secret");
    if (!cronSecret || suppliedSecret !== cronSecret) return response({ error: "Invalid scheduler credentials" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("REPORT_FROM_EMAIL") || "AutoCare <reports@example.com>";
    if (!url || !serviceKey || !resendKey) return response({ error: "Report delivery is not configured" }, 503);
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await supabase.from("report_schedules").select("*").eq("enabled", 1).lte("next_run_at", new Date().toISOString()).limit(50);
    if (error) return response({ error: error.message }, 500);
    const results: { id: string; sent: boolean; error?: string }[] = [];
    for (const schedule of (data ?? []) as Schedule[]) {
        try {
            const periodEnd = new Date();
            const periodStart = new Date(periodEnd);
            if (schedule.frequency === "weekly") periodStart.setDate(periodStart.getDate() - 7);
            else periodStart.setMonth(periodStart.getMonth() - 1);
            const expenses = await loadExpenses(supabase, schedule, periodStart, periodEnd);
            const csv = makeCsv(expenses);
            const attachment = schedule.format === "pdf"
                ? { filename: `${safeName(schedule.name)}.pdf`, content: bytesToBase64(await makePdf(schedule, expenses, periodStart, periodEnd)) }
                : { filename: `${safeName(schedule.name)}.csv`, content: bytesToBase64(new TextEncoder().encode(csv)) };
            const total = expenses.reduce((sum, entry) => sum + entry.amount, 0);
            const mail = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    from,
                    to: [schedule.delivery_email],
                    subject: `${schedule.name} · ${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`,
                    html: `<h1>${escapeHtml(schedule.name)}</h1><p>${expenses.length} expense records · Total ${total.toFixed(2)}</p><p>Your ${schedule.format.toUpperCase()} report is attached.</p>`,
                    attachments: [attachment],
                }),
            });
            if (!mail.ok) throw new Error((await mail.json())?.message || "Email provider rejected the report");
            await supabase.from("report_schedules").update({ last_sent_at: new Date().toISOString(), next_run_at: advanceRun(schedule) }).eq("id", schedule.id);
            results.push({ id: schedule.id, sent: true });
        } catch (error) {
            console.error("scheduled report failed", schedule.id, error);
            results.push({ id: schedule.id, sent: false, error: error instanceof Error ? error.message : "Unknown report error" });
        }
    }
    return response({ processed: results.length, results });
});

async function loadExpenses(supabase: ReturnType<typeof createClient>, schedule: Schedule, start: Date, end: Date) {
    const from = start.toISOString().slice(0, 10);
    const to = end.toISOString().slice(0, 10);
    const tables = [
        { name: "fuel_expenses", vehicle: "selected_vehicle_id", date: "date", title: "fuel_type", amount: "total_cost", category: "fuel", place: "location_name" },
        { name: "charging_expenses", vehicle: "selected_vehicle_id", date: "date", title: "charger_type", amount: "total_cost", category: "charging", place: "location_name" },
        { name: "service_expenses", vehicle: "selected_vehicle_id", date: "date", title: "type_of_service", amount: "cost", category: "service", place: "location_name" },
        { name: "insurance_expenses", vehicle: "selected_vehicle_id", date: "valid_from", title: "provider", amount: "cost", category: "insurance", place: "location_name" },
        { name: "general_expenses", vehicle: "vehicle_id", date: "date", title: "title", amount: "amount", category: null, place: "location_name" },
    ];
    const output: ExpenseRow[] = [];
    for (const table of tables) {
        let query = supabase.from(table.name).select(`user_id,${table.vehicle},${table.date},${table.title},${table.amount},${table.place}${table.category === null ? ",category" : ""}`).eq("user_id", schedule.user_id).gte(table.date, from).lte(table.date, to);
        if (schedule.vehicle_id) query = query.eq(table.vehicle, schedule.vehicle_id);
        const { data, error } = await query;
        if (error) throw error;
        for (const row of data ?? []) {
            output.push({
                date: String(row[table.date] ?? ""),
                category: table.category ?? String(row.category ?? "other"),
                title: String(row[table.title] ?? table.category ?? "Expense"),
                amount: Number(row[table.amount] ?? 0),
                vehicle_id: String(row[table.vehicle] ?? ""),
                place: String(row[table.place] ?? "") || null,
            });
        }
    }
    return output.sort((a, b) => b.date.localeCompare(a.date));
}

function makeCsv(expenses: ExpenseRow[]) {
    const escape = (value: unknown) => /[",\n]/.test(String(value ?? "")) ? `"${String(value ?? "").replace(/"/g, '""')}"` : String(value ?? "");
    return [["date", "category", "title", "amount", "vehicle_id", "place"], ...expenses.map((entry) => [entry.date, entry.category, entry.title, entry.amount, entry.vehicle_id, entry.place])].map((row) => row.map(escape).join(",")).join("\n");
}

async function makePdf(schedule: Schedule, expenses: ExpenseRow[], start: Date, end: Date) {
    const document = await PDFDocument.create();
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    let page = document.addPage([595, 842]);
    let y = 790;
    const draw = (text: string, size = 10, isBold = false) => {
        if (y < 55) { page = document.addPage([595, 842]); y = 790; }
        // PDF standard fonts are WinAnsi-only. Normalize unsupported glyphs so
        // a vendor/title in another script cannot make the whole report fail.
        page.drawText(pdfSafe(text).slice(0, 105), { x: 42, y, size, font: isBold ? bold : regular, color: rgb(0.08, 0.13, 0.25) });
        y -= size + 8;
    };
    draw(schedule.name, 20, true);
    draw(`${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`, 11);
    draw(`Total: ${expenses.reduce((sum, entry) => sum + entry.amount, 0).toFixed(2)} · ${expenses.length} records`, 12, true);
    y -= 8;
    draw("Date        Category       Amount       Description", 10, true);
    for (const entry of expenses) draw(`${entry.date}  ${entry.category.padEnd(13).slice(0, 13)} ${entry.amount.toFixed(2).padStart(10)}  ${entry.title}`);
    return document.save();
}

function advanceRun(schedule: Schedule) {
    const next = new Date(schedule.next_run_at || Date.now());
    if (schedule.frequency === "weekly") next.setUTCDate(next.getUTCDate() + 7);
    else next.setUTCMonth(next.getUTCMonth() + 1);
    while (next.getTime() <= Date.now()) {
        if (schedule.frequency === "weekly") next.setUTCDate(next.getUTCDate() + 7);
        else next.setUTCMonth(next.getUTCMonth() + 1);
    }
    return next.toISOString();
}

function bytesToBase64(bytes: Uint8Array) {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    return btoa(binary);
}
function safeName(value: string) { return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "autocare-report"; }
function pdfSafe(value: string) { return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "?"); }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character)); }
function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
