import { useContext } from "react";
import { ProfileContext } from "../providers/ProfileDataProvider";
import { View, Text } from "react-native";

const getSortedFuelTypesByFrequency = (arr: string[]) => {
    const freqMap: Record<string, number> = arr.reduce((acc: any, fuelType: string) => {
        acc[fuelType] = (acc[fuelType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        Object.entries(freqMap)
            // @ts-ignore
            .sort((a, b) => b[1] - a[1]) // sort descending by count
            .map(([fuelType, count]) => ({ fuelType, count }))
    );
};

export function FuelTypeScreen() {
    const { userVehiclesFuelType, vehicles } = useContext(ProfileContext);

    const sortedFuelTypes = getSortedFuelTypesByFrequency(
        userVehiclesFuelType ?? []
    );

    return (
        <>
            {sortedFuelTypes.map(({ count, fuelType }) => {
                return (
                    <View key={fuelType}>
                        <Text>
                            {count} fuel type: {fuelType}
                        </Text>
                    </View>
                );
            })}
        </>
    );
}
