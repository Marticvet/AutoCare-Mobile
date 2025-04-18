import React, { useContext, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ProfileContext } from "../providers/ProfileDataProvider";
import HomeScreenDropdown from "./HomeScreenDropdown";

const { width } = Dimensions.get("window");

const ITEM_WIDTH = width * 0.75;
const ITEM_HEIGHT = 200;
const ITEM_SPACER = (width - ITEM_WIDTH) / 2;

const HomeScreen = () => {
    const navigation = useNavigation();
    const { selectedVehicle, vehicles, userProfile } =
        useContext(ProfileContext);

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
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    Welcome Back, {userProfile?.first_name}!
                </Text>
                <Text style={styles.headerSubtitle}>
                    Keep track of your car's health
                </Text>
            </View>

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
                    Selected Vehicle: {selectedVehicle?.id}
                </Text>
                <Text style={styles.sectionTitle}>Your Vehicles</Text>
            </View>

            {/* Animated FlatList */}
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
                            <Animated.View
                                style={[
                                    styles.card,
                                    { transform: [{ scale }, { translateY }] },
                                ]}
                            >
                                <Text style={styles.title}>
                                    🚗 {item.vehicle_brand} {item.vehicle_model}
                                </Text>
                                <Text>Odometer: {item.current_mileage} km</Text>
                                <Text>Next Service:</Text>
                                <Text>Insurance Expires:</Text>
                                <Text>Last Tire Change:</Text>
                            </Animated.View>
                        </View>
                    );
                }}
            />
        </View>
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
        marginTop: 48,
        width: ITEM_WIDTH,
        ////// this makes the carouse in the middle
        // justifyContent: "center",
        // alignItems: "center",
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
    title: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#00AFCF",
        marginBottom: 10,
    },
});

export default HomeScreen;
