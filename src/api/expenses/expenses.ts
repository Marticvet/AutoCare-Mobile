import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Fuel_Expenses } from "../../../types/fuel_expenses";
import { useSystem } from "../../powersync/PowerSync";

const queryKey: string = "vehicles";

export const useExpensesList = (selected_vehicle_id: string) => {
    const { db } = useSystem();

    return useQuery({
        queryKey: [queryKey, selected_vehicle_id],
        queryFn: async () => {
            const vehicle = await db
                .selectFrom("vehicles")
                .selectAll()
                .where("id", "=", selected_vehicle_id)
                .executeTakeFirst();

            if (!vehicle) {
                throw new Error("Vehicle not found.");
            }

            const [fuel_expenses, insurance_expenses, service_expenses] =
                await Promise.all([
                    db
                        .selectFrom("fuel_expenses")
                        .selectAll()
                        .where("selected_vehicle_id", "=", selected_vehicle_id)
                        .execute(),
                    db
                        .selectFrom("insurance_expenses")
                        .selectAll()
                        .where("selected_vehicle_id", "=", selected_vehicle_id)
                        .execute(),
                    db
                        .selectFrom("service_expenses")
                        .selectAll()
                        .where("selected_vehicle_id", "=", selected_vehicle_id)
                        .execute(),
                ]);

            return {
                ...vehicle,
                fuel_expenses,
                insurance_expenses,
                service_expenses,
            };
        },
    });
};

// "created_at": "2025-03-01 10:27:28.504048Z",
// "current_mileage": 23941,
// "fuel_expenses": [
//     {
//         "date": "2025-02-26",
//         "fuel_type": "Diesel",
//         "full_tank": 1,
//         "gas_station": "nqkude",
//         "id": "25",
//         "id:1": "25",
//         "location_name": null,
//         "notes": "dada",
//         "odometer": 211222,
//         "payment_method": "card",
//         "price_liter": 2.2,
//         "selected_vehicle_id": "24",
//         "time": "20:36:26",
//         "total_cost": 120.01,
//         "total_litres": 50.3,
//         "user_id": "9fda32ea-6046-4254-a705-88237633470e"
//     },
//     {
//         "date": "2025-03-05",
//         "fuel_type": "Diesel",
//         "full_tank": 0,
//         "gas_station": "Nqkude",
//         "id": "26",
//         "id:1": "26",
//         "location_name": null,
//         "notes": null,
//         "odometer": 23111,
//         "payment_method": "Card",
//         "price_liter": 1.23,
//         "selected_vehicle_id": "24",
//         "time": "21:24:25",
//         "total_cost": 32.5,
//         "total_litres": 15.6,
//         "user_id": "9fda32ea-6046-4254-a705-88237633470e"
//     },
//     {
//         "date": "2025-03-13",
//         "fuel_type": "Diesel",
//         "full_tank": 0,
//         "gas_station": "Nqkude",
//         "id": "27",
//         "id:1": "27",
//         "location_name": null,
//         "notes": null,
//         "odometer": 33222,
//         "payment_method": "Cache",
//         "price_liter": 1.53,
//         "selected_vehicle_id": "24",
//         "time": "00:20:44",
//         "total_cost": 50.43,
//         "total_litres": 20.36,
//         "user_id": "9fda32ea-6046-4254-a705-88237633470e"
//     }
// ],
// "id": "24",
// "id:1": "24",
// "insurance_expenses": [
//     {
//         "cost": 990.92,
//         "id": "1",
//         "id:1": "1",
//         "notes": "Ebalo is e maikata",
//         "odometer": 32111,
//         "selected_vehicle_id": "24",
//         "user_id": "9fda32ea-6046-4254-a705-88237633470e",
//         "valid_from": "2025-03-11",
//         "valid_to": "2025-03-11"
//     }
// ],
// "service_expenses": [
//     {
//         "cost": 322.21,
//         "date": "2025-03-25",
//         "id": "8",
//         "id:1": "8",
//         "location_name": "Vollradser Allee 11, 65375 Oestrich-Winkel, Germany",
//         "notes": "",
//         "odometer": 203331,
//         "payment_method": "Cache",
//         "place": "{\"latitude\":50.00483004185191,\"longitude\":8.001220114950488}",
//         "selected_vehicle_id": "24",
//         "time": null,
//         "type_of_service": "Inspection",
//         "user_id": "9fda32ea-6046-4254-a705-88237633470e"
//     }
// ],
// "user_id": "9fda32ea-6046-4254-a705-88237633470e",
// "vehicle_brand": "BMW",
// "vehicle_car_type": "SUV",
// "vehicle_identification_number": "vin",
// "vehicle_license_plate": "HU-MT7927",
// "vehicle_model": "128",
// "vehicle_model_year": 2024,
// "vehicle_year_of_manufacture": 2022
// }
