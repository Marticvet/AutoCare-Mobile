import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import {
    getCarMake,
    getCarMakeModels,
    getCarTrims,
} from "../../api/fetchCarsApi/fetchCarsApi";
import {
    Button,
    Card,
    ChoiceChips,
    FormField,
    LoadingState,
    PresetOrCustomField,
    Screen,
    SectionHeader,
    SelectField,
    YearField,
} from "../../components/ui";
import { useVehicle } from "../../data/liveQueries";
import { saveVehicle } from "../../data/repository";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { useAuth } from "../../providers/AuthProvider";
import { colors, spacing, typography } from "../../theme/tokens";
import { toNumber } from "../../utils/tracking";
import { Brands } from "../../../types/Brands";
import { Models } from "../../../types/Models";
import { Trims } from "../../../types/Trims";

type Props = NativeStackScreenProps<RootStackParamList, "VehicleForm">;

export default function VehicleFormScreen({ route, navigation }: Props) {
    const vehicleId = route.params?.vehicleId;
    const { userId } = useAuth();
    const { t, distanceUnit } = usePreferences();
    const { data: vehicle, loading } = useVehicle(userId, vehicleId);
    const [brand, setBrand] = useState("");
    const [makeId, setMakeId] = useState("");
    const [model, setModel] = useState("");
    const [trim, setTrim] = useState("");
    const [fuelType, setFuelType] = useState("");
    const [modelYear, setModelYear] = useState("");
    const [manufactureYear, setManufactureYear] = useState("");
    const [type, setType] = useState("car");
    const [plate, setPlate] = useState("");
    const [vin, setVin] = useState("");
    const [mileage, setMileage] = useState("");
    const [catalogMode, setCatalogMode] = useState(!vehicleId);
    const [makes, setMakes] = useState<Brands[]>([]);
    const [models, setModels] = useState<Models[]>([]);
    const [trims, setTrims] = useState<Trims[]>([]);
    const [catalogBusy, setCatalogBusy] = useState(false);
    const [catalogError, setCatalogError] = useState(false);
    const [busy, setBusy] = useState(false);
    const currentYear = new Date().getFullYear();
    const fuelTypes = [
        { value: "gasoline", label: t("gasoline") },
        { value: "diesel", label: t("diesel") },
        { value: "lpg", label: t("lpg") },
        { value: "cng", label: t("cng") },
        { value: "hybrid", label: t("hybrid") },
        { value: "plug-in-hybrid", label: t("plugInHybrid") },
        { value: "electric", label: t("electric") },
        { value: "hydrogen", label: t("hydrogen") },
    ];

    useEffect(() => {
        if (!vehicle) return;
        setBrand(vehicle.vehicle_brand ?? "");
        setModel(vehicle.vehicle_model ?? "");
        setTrim(vehicle.vehicle_trim ?? "");
        setFuelType(vehicle.vehicle_fuel_type ?? "");
        setModelYear(String(vehicle.vehicle_model_year ?? ""));
        setManufactureYear(String(vehicle.vehicle_year_of_manufacture ?? ""));
        setType(vehicle.vehicle_car_type ?? "car");
        setPlate(vehicle.vehicle_license_plate ?? "");
        setVin(vehicle.vehicle_identification_number ?? "");
        const distance =
            distanceUnit === "mi"
                ? (vehicle.current_mileage ?? 0) * 0.621371
                : vehicle.current_mileage ?? 0;
        setMileage(String(Math.round(distance)));
    }, [distanceUnit, vehicle]);

    useEffect(() => {
        if (!catalogMode) return;
        let active = true;
        setCatalogBusy(true);
        setCatalogError(false);
        void getCarMake(modelYear || undefined)
            .then((result) => {
                if (active) setMakes(result);
            })
            .catch(() => {
                if (active) setCatalogError(true);
            })
            .finally(() => {
                if (active) setCatalogBusy(false);
            });
        return () => {
            active = false;
        };
    }, [catalogMode, modelYear]);

    useEffect(() => {
        if (!catalogMode || !makeId) {
            setModels([]);
            return;
        }
        let active = true;
        setCatalogBusy(true);
        setCatalogError(false);
        void getCarMakeModels(makeId, modelYear || undefined)
            .then((result) => {
                if (active) setModels(result);
            })
            .catch(() => {
                if (active) setCatalogError(true);
            })
            .finally(() => {
                if (active) setCatalogBusy(false);
            });
        return () => {
            active = false;
        };
    }, [catalogMode, makeId, modelYear]);

    useEffect(() => {
        if (!catalogMode || !makeId || !model || !modelYear) {
            setTrims([]);
            return;
        }
        let active = true;
        setCatalogBusy(true);
        setCatalogError(false);
        void getCarTrims(makeId, model, modelYear)
            .then((result) => {
                if (active) setTrims(result);
            })
            .catch(() => {
                if (active) setCatalogError(true);
            })
            .finally(() => {
                if (active) setCatalogBusy(false);
            });
        return () => {
            active = false;
        };
    }, [catalogMode, makeId, model, modelYear]);

    const trimOptions = useMemo(() => {
        const seen = new Set<string>();
        return trims.flatMap((item, index) => {
            const label =
                item.model_trim?.trim() || item.model_name?.trim() || t("trim");
            const value = item.model_id || `${label}-${index}`;
            if (seen.has(value)) return [];
            seen.add(value);
            return [{ value, label }];
        });
    }, [t, trims]);

    const selectedTrimId =
        trims.find(
            (item) =>
                (item.model_trim?.trim() ||
                    item.model_name?.trim() ||
                    t("trim")) === trim
        )?.model_id ?? "";

    const chooseYear = (value: string) => {
        setModelYear(value);
        if (!catalogMode) return;
        setMakeId("");
        setBrand("");
        setModel("");
        setTrim("");
        setFuelType("");
    };

    const chooseMake = (value: string) => {
        const selection = makes.find((make) => make.make_id === value);
        setMakeId(value);
        setBrand(selection?.make_display ?? value);
        setModel("");
        setTrim("");
        setFuelType("");
    };

    const chooseModel = (value: string) => {
        setModel(value);
        setTrim("");
        setFuelType("");
    };

    const chooseTrim = (value: string) => {
        const selection = trims.find(
            (item, index) =>
                (item.model_id ||
                    `${
                        item.model_trim || item.model_name || t("trim")
                    }-${index}`) === value
        );
        setTrim(
            selection?.model_trim?.trim() || selection?.model_name?.trim() || ""
        );
        setFuelType(normalizeFuelType(selection?.model_engine_fuel));
    };

    const submit = async () => {
        const formTitle = vehicleId ? t("editVehicle") : t("addVehicle");
        if (
            !brand.trim() ||
            !model.trim() ||
            !plate.trim() ||
            !modelYear.trim() ||
            !fuelType.trim()
        ) {
            Alert.alert(formTitle, t("requiredFields"));
            return;
        }
        if (manufactureYear && toNumber(manufactureYear) > currentYear) {
            Alert.alert(formTitle, t("manufactureYearFuture"));
            return;
        }
        if (
            toNumber(modelYear) < 1886 ||
            toNumber(modelYear) > currentYear + 2 ||
            (manufactureYear && toNumber(manufactureYear) < 1886) ||
            toNumber(mileage) < 0
        ) {
            Alert.alert(formTitle, t("invalidNumber"));
            return;
        }
        setBusy(true);
        try {
            const storedMileage =
                distanceUnit === "mi"
                    ? toNumber(mileage) / 0.621371
                    : toNumber(mileage);
            const savedId = await saveVehicle({
                id: vehicleId,
                userId,
                brand,
                model,
                trim,
                fuelType,
                modelYear,
                manufactureYear,
                type,
                licensePlate: plate,
                vin,
                mileage: String(Math.round(storedMileage)),
            });
            Alert.alert(t("vehicleSaved"));
            if (vehicleId) navigation.goBack();
            else navigation.replace("VehicleDetail", { vehicleId: savedId });
        } catch (error) {
            Alert.alert(formTitle, (error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    if (vehicleId && loading)
        return (
            <Screen>
                <LoadingState />
            </Screen>
        );
    return (
        <Screen>
            <SectionHeader
                title={vehicleId ? t("editVehicle") : t("addVehicle")}
            />
            {/* <ChoiceChips
                value={catalogMode ? "catalog" : "manual"}
                onChange={(value) => setCatalogMode(value === "catalog")}
                options={[
                    { value: "catalog", label: t("vehicleCatalog") },
                    { value: "manual", label: t("manualEntry") },
                ]}
            /> */}
            <Card style={styles.form}>
                {/* {catalogMode ? ( */}
                {false ? (
                    <>
                        <YearField
                            label={t("modelYear")}
                            value={modelYear}
                            onChange={chooseYear}
                            maxYear={currentYear + 2}
                            required
                        />
                        <SelectField
                            label={t("brand")}
                            value={makeId}
                            onChange={chooseMake}
                            options={makes.map((make) => ({
                                value: make.make_id,
                                label: make.make_display,
                            }))}
                            required
                        />
                        <SelectField
                            label={t("model")}
                            value={model}
                            onChange={chooseModel}
                            options={models.flatMap((item) =>
                                item.model_name
                                    ? [
                                          {
                                              value: item.model_name,
                                              label: item.model_name,
                                          },
                                      ]
                                    : []
                            )}
                            required
                        />
                        <SelectField
                            label={t("trim")}
                            value={selectedTrimId}
                            onChange={chooseTrim}
                            options={trimOptions}
                        />
                        {catalogBusy ? (
                            <View style={styles.catalogStatus}>
                                <ActivityIndicator color={colors.primary} />
                                <Text style={styles.helper}>
                                    {t("loadingCatalog")}
                                </Text>
                            </View>
                        ) : null}
                        {catalogError ? (
                            <Text style={styles.error}>
                                {t("catalogUnavailable")}
                            </Text>
                        ) : null}
                    </>
                ) : (
                    <>
                        <FormField
                            label={t("brand")}
                            value={brand}
                            onChangeText={setBrand}
                            autoCapitalize="words"
                            required
                        />
                        <FormField
                            label={t("model")}
                            value={model}
                            onChangeText={setModel}
                            autoCapitalize="words"
                            required
                        />
                        <FormField
                            label={t("trim")}
                            value={trim}
                            onChangeText={setTrim}
                            autoCapitalize="words"
                        />
                        <YearField
                            label={t("modelYear")}
                            value={modelYear}
                            onChange={chooseYear}
                            maxYear={currentYear + 2}
                            required
                        />
                    </>
                )}
                <YearField
                    label={t("manufactureYear")}
                    value={manufactureYear}
                    onChange={setManufactureYear}
                    maxYear={currentYear}
                />
                <PresetOrCustomField
                    label={t("fuelType")}
                    value={fuelType}
                    onChange={setFuelType}
                    options={fuelTypes}
                    placeholder={t("selectFuelType")}
                    required
                />
                <Text style={styles.label}>{t("vehicleType")}</Text>
                <ChoiceChips
                    value={type}
                    onChange={setType}
                    options={[
                        { value: "car", label: t("car"), icon: "car-outline" },
                        {
                            value: "motorcycle",
                            label: t("motorcycle"),
                            icon: "bicycle-outline",
                        },
                        {
                            value: "truck",
                            label: t("truck"),
                            icon: "bus-outline",
                        },
                        {
                            value: "van",
                            label: t("van"),
                            icon: "car-sport-outline",
                        },
                    ]}
                />
                <FormField
                    label={t("licensePlate")}
                    value={plate}
                    onChangeText={setPlate}
                    autoCapitalize="characters"
                    required
                />
                <FormField
                    label={t("vin")}
                    value={vin}
                    onChangeText={setVin}
                    autoCapitalize="characters"
                    maxLength={17}
                />
                <FormField
                    label={`${t("mileage")} (${distanceUnit})`}
                    value={mileage}
                    onChangeText={setMileage}
                    keyboardType="decimal-pad"
                    required
                />
            </Card>
            <Button
                label={t("save")}
                icon="checkmark"
                onPress={submit}
                loading={busy}
            />
        </Screen>
    );
}

function normalizeFuelType(value?: string | null) {
    const fuel = value?.toLowerCase() ?? "";
    if (fuel.includes("diesel")) return "diesel";
    if (fuel.includes("electric")) return "electric";
    if (fuel.includes("hybrid"))
        return fuel.includes("plug") ? "plug-in-hybrid" : "hybrid";
    if (fuel.includes("lpg") || fuel.includes("propane")) return "lpg";
    if (fuel.includes("cng") || fuel.includes("natural gas")) return "cng";
    if (fuel.includes("hydrogen")) return "hydrogen";
    if (fuel.includes("gasoline") || fuel.includes("petrol")) return "gasoline";
    return value?.trim() ?? "";
}

const styles = StyleSheet.create({
    form: { gap: spacing.lg },
    label: {
        ...typography.label,
        color: colors.ink,
        marginBottom: -spacing.sm,
    },
    catalogStatus: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    helper: { ...typography.caption, color: colors.inkMuted },
    error: { ...typography.caption, color: colors.danger },
});
