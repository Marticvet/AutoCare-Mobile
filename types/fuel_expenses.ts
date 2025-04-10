export interface Fuel_Expenses {
    id?: number; // Primary key (int8)
    odometer?: number | string | null; // Odometer reading (int8)
    fuel_type?: string | null; // Fuel type (text)
    price_liter?: number | null; // Price per liter (float8)
    total_cost?: number | null; // Total cost (float8)
    total_litres?: number | null; // Total liters refueled (float8)
    full_tank?: boolean | null; // Whether the tank was filled completely (bool)
    gas_station?: string | null; // Gas station name (text)
    payment_method?: string | null; // Payment method used (text)
    notes?: string | null; // Additional notes (text)
    selected_vehicle_id?: string | null; // Selected vehicle UUID
    user_id?: string | null; // Selected vehicle UUID
    date?: Date | null;
    time?: Date | null | string;
    location_name?: string | null;
}
