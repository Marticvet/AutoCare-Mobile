export interface Profile {
    id: string;
    updated_at: null | Date;
    email: string;
    avatar_url: string;
    first_name: string;
    last_name: string;
    full_name: string | null;
    selected_vehicle_id: string;
    phone_number: string;
    username: string;
}