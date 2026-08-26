import { Brands } from "../../../types/Brands";
import { Models } from "../../../types/Models";
import { Trims } from "../../../types/Trims";

const API_BASE_URL = "https://www.carqueryapi.com/api/0.3/";

async function carQuery<T>(params: Record<string, string>): Promise<T> {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}?${query}`);
    if (!response.ok) throw new Error(`Vehicle catalogue request failed (${response.status})`);
    const body = await response.text();
    const json = body.trim().startsWith("{")
        ? body
        : body.replace(/^[^(]*\(/, "").replace(/\);?\s*$/, "");
    return JSON.parse(json) as T;
}

export const getCarMake = async (year?: string): Promise<Brands[]> => {
    const data = await carQuery<{ Makes?: Brands[] }>({ cmd: "getMakes", ...(year ? { year } : {}) });
    return (data.Makes ?? [])
        .filter((brand) => Number(brand.make_is_common) > 0)
        .sort((a, b) => a.make_display.localeCompare(b.make_display));
};

export const getCarMakeModels = async (
    selectedVehicleBrand: string,
    year?: string
): Promise<Models[]> => {
    const data = await carQuery<{ Models?: Models[] }>({ cmd: "getModels", make: selectedVehicleBrand, ...(year ? { year } : {}) });
    return (data.Models ?? []).filter((model) => Boolean(model.model_name));
};

export const getCarTrims = async (make: string, model: string, year: string): Promise<Trims[]> => {
    const data = await carQuery<{ Trims?: Trims[] }>({ cmd: "getTrims", make, model, year, full_results: "1" });
    return data.Trims ?? [];
};
