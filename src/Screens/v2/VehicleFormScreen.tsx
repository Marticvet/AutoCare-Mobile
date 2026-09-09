import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import {
    Button,
    Card,
    ChoiceChips,
    FormField,
    LoadingState,
    PresetOrCustomField,
    Screen,
    SectionHeader,
    YearField,
} from "../../components/ui";
import { useVehicle } from "../../data/liveQueries";
import { saveVehicle } from "../../data/repository";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { colors, spacing, typography } from "../../theme/tokens";
import { toNumber } from "../../utils/tracking";
import { useGarage } from "../../providers/GarageProvider";
import { useSubscription } from "../../billing/SubscriptionProvider";

type Props = NativeStackScreenProps<RootStackParamList, "VehicleForm">;

export default function VehicleFormScreen({ route, navigation }: Props) {
    const vehicleId = route.params?.vehicleId;
    const { vehicles, dataOwnerId, canWrite } = useGarage();
    const { canAddVehicle, loading: subscriptionLoading } = useSubscription();
    const { t, distanceUnit } = usePreferences();
    const { data: vehicle, loading } = useVehicle(dataOwnerId, vehicleId);
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [trim, setTrim] = useState("");
    const [fuelType, setFuelType] = useState("");
    const [modelYear, setModelYear] = useState("");
    const [manufactureYear, setManufactureYear] = useState("");
    const [type, setType] = useState("car");
    const [plate, setPlate] = useState("");
    const [vin, setVin] = useState("");
    const [mileage, setMileage] = useState("");
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

    const chooseYear = (value: string) => {
        setModelYear(value);
    };

    const submit = async () => {
        const formTitle = vehicleId ? t("editVehicle") : t("addVehicle");
        if (!canWrite) {
            Alert.alert(formTitle, t("viewOnlyGarage"));
            return;
        }
        if (!vehicleId && (subscriptionLoading || !canAddVehicle(vehicles.length))) {
            if (subscriptionLoading) Alert.alert("AutoCare Plus", t("subscriptionStillLoading"));
            else navigation.navigate("Paywall", { source: "vehicle" });
            return;
        }
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
                userId: dataOwnerId,
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
            Alert.alert(t(vehicleId ? "vehicleUpdated" : "vehicleSaved"));
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
            <Card style={styles.form}>
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

const styles = StyleSheet.create({
    form: { gap: spacing.lg },
    label: {
        ...typography.label,
        color: colors.ink,
        marginBottom: -spacing.sm,
    },
});
