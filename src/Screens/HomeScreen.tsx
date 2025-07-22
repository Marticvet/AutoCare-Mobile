import React, {
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    FlatList,
    TouchableOpacity,
    Pressable,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ProfileContext } from "../providers/ProfileDataProvider";
import HomeScreenDropdown from "./HomeScreenDropdown";
import { vehicleTypeIcons } from "../utils/vehicleTypeIcons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Loader } from "./Loader";
import { fetchStations } from "../utils/location";
import TotalExpensesScreen from "./TotalExpensesScreen";
import { ScrollView } from "react-native-gesture-handler";
import { useVehicle, useVehicleList } from "../api/vehicles";
import { Vehicle } from "../powersync/AppSchema";
import { useAuth } from "../providers/AuthProvider";

const { width } = Dimensions.get("window");

const ITEM_WIDTH = width * 0.75;
const ITEM_HEIGHT = 200;
const ITEM_SPACER = (width - ITEM_WIDTH) / 2;

const HomeScreen = () => {
    const { profile } = useAuth();
    const userId = profile?.id || "";
    const navigation = useNavigation();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(
        null
    );
    const { userProfile } = useContext(ProfileContext);

    const {
        error: errorVehicles,
        loading: isVehiclesLoading,
        vehicles: vehiclesList,
        refetch,
    } = useVehicleList(userId);

    useEffect(() => {
        if (vehiclesList && vehiclesList.length > 0) {
            setVehicles(vehiclesList);
        } else {
            setVehicles([]);
        }
    }, [errorVehicles, isVehiclesLoading, vehiclesList]);

    const {
        data: vehicleData,
        isLoading: isSelectedVehicleLoading,
        error: errorSelectedVehicle,
        refetch: refetchVehicle,
    } = useVehicle(userId, userProfile?.selected_vehicle_id || "");

    useEffect(() => {
        if (vehicleData) {
            setSelectedVehicle(vehicleData);
        } else {
            setSelectedVehicle(null);
        }
    }, [errorSelectedVehicle, isSelectedVehicleLoading, vehicleData]);

    useFocusEffect(
        useCallback(() => {
            refetch(); // re-fetch vehicle data when screen is focused
            refetchVehicle();
        }, [userId])
    );

    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);

    // Repeat data to fake infinite loop
    const cloneCount = 3;
    const centerClone = Array(cloneCount).fill(vehicles).flat();

    const repeatedData = [
        { type: "spacer-left", key: "spacer-left" },
        ...centerClone.map((item, index) => ({
            ...item,
            key: `${item.id}-${index}`,
            type: "card",
        })),
        { type: "spacer-right", key: "spacer-right" },
    ];

    const scrollToMiddleIndex = Math.floor(repeatedData.length / 2);

    useEffect(() => {
        if (vehicles && vehicles.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: scrollToMiddleIndex,
                    animated: false,
                });
            }, 50);
        }
    }, [vehicles]);

    // @ts-ignore
    const handleScrollEnd = (e) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        const currentIndex = Math.round(offsetX / ITEM_WIDTH);

        if (vehicles) {
            if (
                currentIndex <= vehicles.length / 2 ||
                currentIndex >= repeatedData.length - vehicles.length / 2
            ) {
                flatListRef.current?.scrollToIndex({
                    index: scrollToMiddleIndex,
                    animated: false,
                });
            }
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    Welcome Back, {userProfile?.first_name}!
                </Text>
                <Text style={styles.headerSubtitle}>
                    Keep track of your car's health
                </Text>
            </View>

            {/* <Pressable onPress={loadTodos}>
                <Text>fetchStations</Text>
            </Pressable>
            <Pressable onPress={addTodo}>
                <Text>add</Text>
            </Pressable> */}

            {/* Dropdown */}
            <View style={styles.dropdownContainer}>
                <HomeScreenDropdown
                    // @ts-ignore
                    data={vehicles}
                    placeholder="Select your vehicle"
                />
            </View>

            {/* Vehicle Info */}
            <View style={styles.contentContainer}>
                <Text style={styles.infoText}>
                    Main Vehicle: {selectedVehicle?.vehicle_brand} |{" "}
                    {selectedVehicle?.vehicle_model} |{" "}
                    {selectedVehicle?.vehicle_license_plate}
                </Text>
                <Text style={styles.sectionTitle}>Your Vehicles</Text>
            </View>

            {errorVehicles == false &&
                isVehiclesLoading == true &&
                vehicles &&
                vehicles.length === 0 && (
                    <View style={styles.vehicleLoaderContainer}>
                        <Loader text={"Your vehicles are loading..."} />
                    </View>
                )}
            {errorVehicles &&
                isVehiclesLoading == false &&
                vehicles &&
                vehicles.length === 0 && (
                    <View style={styles.errorVehiclesContainer}>
                        <Text style={styles.errorVehiclesText}>
                            Error while loading your vehicles!
                        </Text>
                        <Text style={styles.errorVehiclesText}>
                            Please try later...
                        </Text>
                    </View>
                )}

            {/* Animated FlatList */}
            {vehicles && vehicles?.length > 0 && (
                <Animated.FlatList
                    ref={flatListRef}
                    data={repeatedData}
                    keyExtractor={(item) => item.key}
                    horizontal
                    snapToInterval={ITEM_WIDTH}
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onMomentumScrollEnd={handleScrollEnd}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: true }
                    )}
                    getItemLayout={(_, index) => ({
                        length: ITEM_WIDTH,
                        offset: ITEM_WIDTH * index,
                        index,
                    })}
                    renderItem={({ item, index }) => {
                        if (item.type?.includes("spacer")) {
                            return <View style={{ width: ITEM_SPACER }} />;
                        }

                        const inputRange = [
                            (index - 2) * ITEM_WIDTH,
                            (index - 1) * ITEM_WIDTH,
                            index * ITEM_WIDTH,
                            (index + 1) * ITEM_WIDTH,
                            (index + 2) * ITEM_WIDTH,
                        ];

                        const scale = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.85, 1, 0.85, 0, 0], // 👈 bump these values
                            extrapolate: "clamp",
                        });

                        const translateY = scrollX.interpolate({
                            inputRange,
                            outputRange: [12, 6, 0, 6, 12],
                            extrapolate: "clamp",
                        });

                        return (
                            <View style={styles.cardWrapper}>
                                <TouchableOpacity
                                    style={[
                                        styles.card,
                                        {
                                            transform: [
                                                { scale },
                                                { translateY },
                                            ],
                                        },
                                    ]}
                                    onPress={() => {
                                        navigation.navigate(
                                            // @ts-ignore
                                            "VehicleDetailScreen",
                                            {
                                                vehicleId: item.id,
                                                parentScreenName: "HomeScreen",
                                            }
                                        );
                                    }}
                                >
                                    <View style={styles.titleContainer}>
                                        <Text style={styles.title}>
                                            {item.vehicle_brand}{" "}
                                            {item.vehicle_model}
                                        </Text>
                                        <MaterialCommunityIcons
                                            //@ts-ignore
                                            name={
                                                vehicleTypeIcons[
                                                    item.vehicle_car_type
                                                ] || "car"
                                            }
                                            size={24}
                                            color="#6c6b6b"
                                        />
                                    </View>

                                    <Text>
                                        Odometer: {item.current_mileage} km
                                    </Text>
                                    <Text>Next Service:</Text>
                                    <Text>Insurance Expires:</Text>
                                    <Text>Last Tire Change:</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                />
            )}

            {/* <TotalExpensesScreen hideUIElements={true} /> */}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 48,
        backgroundColor: "#f3f3f3",
    },
    dropdownContainer: {
        marginBottom: 20,
        paddingHorizontal: 16,
    },
    contentContainer: {
        paddingHorizontal: 16,
    },
    infoText: {
        fontSize: 18,
        color: "#333",
    },
    header: {
        width: "100%",
        height: 64,
        justifyContent: "center",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
    },
    headerSubtitle: {
        fontSize: 16,
        color: "#666",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginVertical: 10,
    },
    cardWrapper: {
        paddingBottom: 56,
        width: ITEM_WIDTH,
        ////// this makes the carouse in the middle
        justifyContent: "center",
        alignItems: "center",
    },
    card: {
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT,
        borderRadius: 16,
        backgroundColor: "#fff",
        padding: 16,
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 3,
    },
    titleContainer: {
        flexDirection: "row",
        alignItems: "center", // vertical centering
        gap: 6, // spacing between text and icon (RN 0.71+)
        paddingBottom: 8,
    },

    title: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#00AFCF",
        marginRight: 6, // manually add spacing before the icon
    },

    ////// vehicles error
    errorVehiclesContainer: {
        flex: 1,
        alignContent: "center",
        justifyContent: "center",
        // flexDirection: "row",
    },
    errorVehiclesText: {
        textAlign: "center",
        fontSize: 18,
        color: "#e64848",
        fontWeight: 600,
    },

    /// vehicle loader container
    vehicleLoaderContainer: {
        height: 240,
    },
});

export default HomeScreen;
