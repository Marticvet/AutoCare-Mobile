import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    try {
        const authorization = request.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
        const url = Deno.env.get("SUPABASE_URL");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        const visionKey = Deno.env.get("GOOGLE_CLOUD_VISION_API_KEY");
        if (!url || !anonKey) throw new Error("Supabase function configuration is missing.");
        if (!visionKey) return json({
            error: "Receipt scanning is not configured yet. Add the Google Cloud Vision server key and try again.",
            code: "ocr_not_configured",
        }, 503);

        const userClient = createClient(url, anonKey, {
            global: { headers: { Authorization: authorization } },
            auth: { persistSession: false },
        });
        const { data: { user }, error: authError } = await userClient.auth.getUser();
        if (authError || !user) return json({ error: "Invalid session" }, 401);

        const { imageBase64 } = await request.json() as { imageBase64?: string };
        if (!imageBase64 || imageBase64.length > 10_000_000) return json({
            error: "Use a receipt image smaller than 7 MB.",
            code: "invalid_receipt_image",
        }, 400);
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(visionKey)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                requests: [{
                    image: { content: imageBase64 },
                    features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
                }],
            }),
        });
        const payload = await response.json();
        if (!response.ok) return json({
            error: payload?.error?.message || "The OCR provider could not process this receipt.",
            code: "ocr_provider_error",
        }, response.status === 429 ? 429 : 502);
        const annotation = payload?.responses?.[0];
        if (annotation?.error?.message) return json({
            error: annotation.error.message,
            code: "ocr_provider_error",
        }, 502);
        const text = annotation?.fullTextAnnotation?.text || annotation?.textAnnotations?.[0]?.description || "";
        if (!text.trim()) return json({
            error: "No readable text was found. Retake the photo in good light with the full receipt visible.",
            code: "receipt_text_not_found",
        }, 422);
        return json(parseReceipt(text));
    } catch (error) {
        console.error("receipt-ocr failed", error);
        return json({ error: error instanceof Error ? error.message : "Receipt recognition failed" }, 500);
    }
});

function parseReceipt(text: string) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const numberPattern = /(?:€|\$|£|BGN|EUR|USD|GBP)?\s*(-?\d{1,6}(?:[.,]\d{2}))\b/gi;
    const totalKeywords = /(grand\s*total|amount\s*due|total|summe|gesamt|suma|obshto|obsto)/i;
    const totalCandidates = lines
        .filter((line) => totalKeywords.test(line))
        .flatMap((line) => [...line.matchAll(numberPattern)].map((match) => ({ line, value: parseNumber(match[1]) })))
        .filter((entry) => entry.value > 0);
    const allCandidates = lines
        .flatMap((line) => [...line.matchAll(numberPattern)].map((match) => ({ line, value: parseNumber(match[1]) })))
        .filter((entry) => entry.value > 0);
    const amountEntry = totalCandidates.at(-1) || allCandidates.sort((a, b) => b.value - a.value)[0];

    const dateMatch = text.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
        || text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
    let date = "";
    if (dateMatch) {
        if (dateMatch[1].length === 4) date = iso(Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3]));
        else date = iso(Number(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]), Number(dateMatch[2]), Number(dateMatch[1]));
    }

    const vendor = lines.slice(0, 6).find((line) =>
        line.length >= 3
        && !/receipt|invoice|fiscal|tax|vat|tel|www\.|@|date/i.test(line)
        && !/^[-\d\s.,/:]+$/.test(line)
    ) || "";
    const normalized = text.toLowerCase();
    const category = /fuel|diesel|petrol|gasoline|benzin|tankstelle|lit(?:re|er)/.test(normalized) ? "fuel"
        : /charg|kwh|electric/.test(normalized) ? "charging"
            : /service|repair|workshop|garage|maintenance|oil change|reifen|tyre|tire/.test(normalized) ? "service"
                : /parking|parkhaus/.test(normalized) ? "parking"
                    : /car wash|autowasch/.test(normalized) ? "wash"
                        : /toll|maut/.test(normalized) ? "toll"
                            : "other";
    const paymentMethod = /visa|mastercard|credit card|karte/.test(normalized) ? "credit-card"
        : /debit/.test(normalized) ? "debit-card"
            : /cash|bar bezahlt/.test(normalized) ? "cash" : "";
    return {
        amount: amountEntry?.value ?? null,
        date: date || null,
        vendor: vendor || null,
        title: vendor || (category === "other" ? "Receipt" : category),
        category,
        paymentMethod: paymentMethod || null,
        confidence: {
            amount: totalCandidates.length ? "high" : amountEntry ? "medium" : "low",
            date: date ? "medium" : "low",
            vendor: vendor ? "medium" : "low",
        },
    };
}

function parseNumber(value: string) {
    const comma = value.lastIndexOf(",");
    const dot = value.lastIndexOf(".");
    const normalized = comma > dot ? value.replace(/\./g, "").replace(",", ".") : value.replace(/,/g, "");
    return Number(normalized) || 0;
}

function iso(year: number, month: number, day: number) {
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
