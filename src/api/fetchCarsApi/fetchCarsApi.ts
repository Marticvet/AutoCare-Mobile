import { Brands } from "../../../types/Brands";
import { Models } from "../../../types/Models";

const API_BASE_URL = "https://www.carqueryapi.com/api/0.3/";

export const getCarMake = async (): Promise<Brands[]> => {
    const response = await fetch(`${API_BASE_URL}?cmd=getMakes`);
    const data = await response.json();
    return data.Makes.filter(
        (brand: Brands) => Number(brand.make_is_common) > 0
    );
};

export const getCarMakeModels = async (selectedVehicleBrand: string): Promise<Models[]>=> {
    const response = await fetch(
        `${API_BASE_URL}?cmd=getModels&make=${selectedVehicleBrand}`
    );

    return await response.json().then(res => res.Models);
};
