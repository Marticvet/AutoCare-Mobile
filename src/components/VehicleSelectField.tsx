import React from "react";
import { VehicleRecord } from "../data/models";
import { usePreferences } from "../i18n/PreferencesProvider";
import { SelectField } from "./ui";

export function VehicleSelectField({
    vehicles,
    value,
    onChange,
    includeAll = false,
    label,
}: {
    vehicles: VehicleRecord[];
    value: string;
    onChange: (value: string) => void;
    includeAll?: boolean;
    label?: string;
}) {
    const { t } = usePreferences();
    const options = [
        ...(includeAll ? [{ value: "all", label: t("allVehicles") }] : []),
        ...vehicles
            .filter((vehicle) => Boolean(vehicle.id))
            .map((vehicle) => ({
                value: vehicle.id ?? "",
                label: [
                    `${vehicle.vehicle_brand ?? ""} ${vehicle.vehicle_model ?? ""}`.trim(),
                    vehicle.vehicle_license_plate ?? "",
                ].filter(Boolean).join(" · ") || t("vehicle"),
            })),
    ];

    return (
        <SelectField
            label={label ?? t("vehicle")}
            value={value}
            onChange={onChange}
            options={options}
            placeholder={t("selectVehicle")}
            required={!includeAll}
        />
    );
}
