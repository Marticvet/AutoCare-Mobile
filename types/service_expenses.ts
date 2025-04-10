interface Service_Expenses {
    id?: number; // Primary key (int8)
    odometer?: number | null; // Odometer reading (int8)
    cost?: number | null; // Cost of insurance (float8)
    type_of_service?: string | null; // type of service (text)
    place?: string | null; // type of service (text)
    payment_method?: string | null; // Payment method used (text)
    notes?: string | null; // Additional notes (text)
    selected_vehicle_id?: string | null; // Selected vehicle UUID
    user_id?: string | null; // Selected vehicle UUID
    date?: Date | null,
    time?: Date | null | string,
    location_name?: string | null;
}