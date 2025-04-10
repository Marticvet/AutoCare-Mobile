export interface Insurance_Expenses {
    id?: number; // Primary key (int8)
    odometer?: number | null; // Odometer reading (int8)
    cost?: number | null; // Cost of insurance (float8)
    notes?: string | null; // Additional notes (text)
    selected_vehicle_id?: string | null; // Selected vehicle UUID
    user_id?: string | null; // Selected vehicle UUID
    valid_from?: Date | null,
    valid_to?: Date | null,
}