import { Brands } from "../../../types/Brands";
import { Models } from "../../../types/Models";

const API_BASE_URL = "https://www.carqueryapi.com/api/0.3/";

export const getCarMake = async (): Promise<Brands[]> => {
    return await fetch(`${API_BASE_URL}?cmd=getMakes&callback=?`)
        .then((res) => res.json())
        .then((data) => {
            return data.Makes.filter(
                (brand: Brands) => Number(brand.make_is_common) > 0
            );
        })
        .catch((e) => {
            console.warn(e);
        });
};

export const getCarMakeModels = async (
    selectedVehicleBrand: string
): Promise<Models[]> => {
    return await fetch(
        `${API_BASE_URL}?cmd=getModels&make=${selectedVehicleBrand}`
    )
        .then((res) => res.json())
        .then((res) => res.Models);
};
