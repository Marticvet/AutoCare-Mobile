export interface VehicleData {
    id?: string;
    selected_vehicle_id?: string;
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_model_year: number;
    vehicle_car_type: string;
    vehicle_license_plate: string;
    vehicle_year_of_manufacture: string | number;
    vehicle_identification_number: string;
    current_mileage: number;
    user_id: string | null | undefined;
}