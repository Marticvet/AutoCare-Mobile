const enabled = (value: string | undefined) => value === "true";

/**
 * Server-backed features remain hidden until their production services,
 * secrets, legal disclosures, and end-to-end tests are ready.
 *
 * Expo replaces explicit EXPO_PUBLIC_* references at bundle time. Keep these
 * references static rather than looking them up dynamically.
 */
export const releaseFeatures = Object.freeze({
    receiptOcr: enabled(process.env.EXPO_PUBLIC_ENABLE_RECEIPT_OCR),
    scheduledReportDelivery: enabled(process.env.EXPO_PUBLIC_ENABLE_SCHEDULED_REPORTS),
    fleetBilling: enabled(process.env.EXPO_PUBLIC_ENABLE_FLEET_BILLING),
});
