import React, { useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ScrollView,
} from "react-native";
import {
    FontAwesome5,
    FontAwesome6,
    Fontisto,
    Ionicons,
    MaterialIcons,
} from "@expo/vector-icons";
import BouncyCheckbox from "react-native-bouncy-checkbox";

const ReminderScreen = () => {
    const [expenseType, setExpenseType] = useState<string>("");
    const [serviceType, setServiceType] = useState<string>("");
    const [odometer, seOdometer] = useState<string>("");
    const [date, setDate] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    const [isKmChecked, setIsKmChecked] = useState(true);
    const [isDateChecked, setIsDateChecked] = useState(false);

    // References for each input field to manage focus
    const serviceTypeRef = useRef(null);
    const notesRef = useRef(null);
    const odometerRef = useRef(null);
    const dateRef = useRef(null);

    const [showServiceReminderContainer, setShowServiceReminderContainer] =
        useState(false);
    const [selectRepeaterSwitch, setSelectRepeaterSwitch] = useState(false);

    function submitSaveHandler() {
        console.log({
            expenseType,
            serviceType,
            odometer,
            date,
            notes,
            repeat: selectRepeaterSwitch === false ? "once" : "multiple",
        });
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content}>
                {/* Switch Container */}
                <View
                    style={[styles.switchContainer, styles.typeSwitchContainer]}
                >
                    {showServiceReminderContainer === false ? (
                        <MaterialIcons
                            name="payment"
                            size={24}
                            color="#6c6b6b"
                            style={[styles.icon]}
                        />
                    ) : (
                        <MaterialIcons
                            name="car-repair"
                            size={24}
                            color="#6c6b6b"
                            style={[styles.icon]}
                        />
                    )}

                    <View style={styles.switchButtonContainer}>
                        <Pressable
                            style={[
                                styles.switchButton,
                                !showServiceReminderContainer &&
                                    styles.activeButton,
                            ]}
                            onPress={() =>
                                setShowServiceReminderContainer(false)
                            }
                        >
                            <Text
                                style={[
                                    styles.switchText,
                                    !showServiceReminderContainer &&
                                        styles.activeText,
                                ]}
                            >
                                Expense
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.switchButton,
                                showServiceReminderContainer &&
                                    styles.activeButton,
                            ]}
                            onPress={() =>
                                setShowServiceReminderContainer(true)
                            }
                        >
                            <Text
                                style={[
                                    styles.switchText,
                                    showServiceReminderContainer &&
                                        styles.activeText,
                                ]}
                            >
                                Service
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Type of Service / Expense Input*/}
                <View
                    style={[
                        styles.inputContainer,
                        styles.inputTypeContainerCustom,
                    ]}
                >
                    <View style={styles.innerInputContainer}>
                        {!showServiceReminderContainer ? (
                            <TextInput
                                ref={serviceTypeRef}
                                placeholder="Type of service"
                                value={serviceType}
                                onChangeText={setServiceType}
                                keyboardType="default"
                                returnKeyType="next"
                                onSubmitEditing={() =>
                                    // @ts-ignore
                                    serviceTypeRef.current?.focus()
                                }
                                style={styles.input}
                    clearButtonMode={'always'}

                            />
                        ) : (
                            <TextInput
                                // ref={odometerRef}
                                placeholder="Type of expense"
                                value={expenseType}
                                onChangeText={setExpenseType}
                                keyboardType="default"
                                returnKeyType="next"
                                onSubmitEditing={() =>
                                    // @ts-ignore
                                    serviceTypeRef.current?.focus()
                                }
                                style={styles.input}
                    clearButtonMode={'always'}

                            />
                        )}
                    </View>
                </View>

                {/* Switch one time/ repeat */}
                <View style={styles.switchContainer}>
                    <Fontisto
                        name="bell-alt"
                        size={24}
                        color="#6c6b6b"
                        style={styles.icon}
                    />

                    <View style={styles.switchButtonContainer}>
                        <Pressable
                            style={[
                                styles.switchButton,
                                !selectRepeaterSwitch && styles.activeButton,
                            ]}
                            onPress={() => setSelectRepeaterSwitch(false)}
                        >
                            <Text
                                style={[
                                    styles.switchText,
                                    !selectRepeaterSwitch && styles.activeText,
                                ]}
                            >
                                Just one time
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.switchButton,
                                selectRepeaterSwitch && styles.activeButton,
                            ]}
                            onPress={() => setSelectRepeaterSwitch(true)}
                        >
                            <Text
                                style={[
                                    styles.switchText,
                                    selectRepeaterSwitch && styles.activeText,
                                ]}
                            >
                                Repeat
                            </Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.repeaterSelectContainer}>
                    {/* Odometer Checkbox & Input */}
                    <View style={styles.repetearSelectInputContainer}>
                        <BouncyCheckbox
                            isChecked={isKmChecked}
                            size={25}
                            fillColor="#4942CD"
                            unFillColor="#FFFFFF"
                            iconStyle={{
                                borderColor: "#4942CD",
                                borderWidth: 2,
                                borderRadius: 5,
                            }}
                            innerIconStyle={{
                                borderWidth: 2,
                                borderRadius: 5,
                            }}
                            onPress={(isChecked: boolean) =>
                                setIsKmChecked(isChecked)
                            }
                        />
                        <TextInput
                            style={styles.repetearSelectInput}
                            placeholder="Odometer (km)"
                            placeholderTextColor="#888"
                            keyboardType="numeric"
                            value={odometer}
                            onChangeText={seOdometer}
                            onSubmitEditing={() =>
                                // @ts-ignore
                                odometerRef.current?.focus()
                            }
                    clearButtonMode={'always'}

                        />
                    </View>

                    {/* Date Checkbox & Input */}
                    <View style={styles.repetearSelectInputContainer}>
                        <BouncyCheckbox
                            isChecked={isDateChecked}
                            size={25}
                            fillColor="#4942CD"
                            unFillColor="#FFFFFF"
                            iconStyle={{
                                borderColor: "#4942CD",
                                borderWidth: 2,
                                borderRadius: 5,
                            }}
                            innerIconStyle={{
                                borderWidth: 2,
                                borderRadius: 5,
                            }}
                            onPress={(isChecked: boolean) =>
                                setIsDateChecked(isChecked)
                            }
                        />
                        {selectRepeaterSwitch === false ? (
                            <TextInput
                                style={styles.repetearSelectInput}
                                placeholder="Date"
                                placeholderTextColor="#888"
                                keyboardType="default"
                                value={date}
                                onChangeText={setDate}
                                onSubmitEditing={() =>
                                    // @ts-ignore
                                    dateRef.current?.focus()
                                }
                    clearButtonMode={'always'}

                            />
                        ) : (
                            <View style={styles.amountPeriodInputContainer}>
                                <TextInput
                                    style={styles.amountPeriodInput}
                                    placeholder="Amount"
                                    placeholderTextColor="#888"
                                    keyboardType="default"
                                    value={date}
                                    onChangeText={setDate}
                                    onSubmitEditing={() =>
                                        // @ts-ignore
                                        dateRef.current?.focus()
                                    }
                    clearButtonMode={'always'}

                                />

                                <TextInput
                                    style={styles.amountPeriodInput}
                                    placeholder="Period"
                                    placeholderTextColor="#888"
                                    keyboardType="default"
                                    value={date}
                                    onChangeText={setDate}
                                    onSubmitEditing={() =>
                                        // @ts-ignore
                                        dateRef.current?.focus()
                                    }
                    clearButtonMode={'always'}

                                />
                            </View>
                        )}
                    </View>
                </View>

                {/* Note Input */}
                <View style={styles.inputContainer}>
                    <MaterialIcons
                        name="notes"
                        size={24}
                        color="#6c6b6b"
                        style={styles.icon}
                    />
                    <View style={styles.innerInputContainer}>
                        <TextInput
                            ref={notesRef}
                            placeholder="Notes"
                            value={notes}
                            onChangeText={setNotes}
                            returnKeyType="done"
                            onSubmitEditing={() =>
                                // @ts-ignore
                                notesRef.current?.focus()
                            }
                            style={[styles.input, styles.notesInput]}
                            multiline
                    clearButtonMode={'always'}

                        />
                    </View>
                </View>

                {/* Save Button */}
                <Pressable
                    style={({ pressed }) =>
                        pressed ? styles.pressableButton : styles.saveButton
                    }
                    onPress={submitSaveHandler}
                >
                    <Text style={styles.saveButtonText}>SAVE</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 15,
    },
    switchContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 10,
        paddingLeft: 12,
    },
    typeSwitchContainer: {
        paddingLeft: 8,
    },
    switchButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: "#E8E8E8",
        borderRadius: 5,
        marginHorizontal: 5,
        flex: 0.5,
        alignItems: "center",
    },
    switchButtonContainer: {
        flex: 1,
        flexDirection: "row",
        paddingLeft: 12,
    },
    activeButton: {
        backgroundColor: "#4942CD",
    },
    switchText: {
        color: "gray",
        fontSize: 16,
    },
    activeText: {
        color: "white",
    },
    inputContainer: {
        flexDirection: "row",
        padding: 10,
        marginVertical: 5,
        borderRadius: 8,
        marginBottom: 12,
    },
    innerInputContainer: {
        flexDirection: "row",
        flexGrow: 1,
        borderBottomWidth: 1,
        borderBottomColor: "#DDD",
        justifyContent: "flex-start",
        alignItems: "center",
        marginLeft: 16,
    },
    input: {
        fontSize: 16,
        color: "black",
        width: 300,
        height: 48, // Set explicit height
    },
    icon: {
        marginRight: 10,
    },
    notesInput: {
        height: 80,
        textAlignVertical: "top",
    },
    saveButton: {
        marginTop: 24,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#4942CD",
        borderRadius: 12,
        marginHorizontal: 4,
    },
    saveButtonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },
    pressableButton: {
        marginTop: 24,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        marginHorizontal: 4,
        backgroundColor: "#625be7",
    },
    inputTypeContainerCustom: {
        marginLeft: 34,
    },

    amountPeriodInputContainer: {
        flexDirection: "row",
        flex: 0.8,
        alignItems: "center",
        justifyContent: "space-between",
        marginLeft: 16,
    },
    amountPeriodInput: {
        fontSize: 16,
        color: "black",
        height: 48, // Set explicit height
        width: 80,
        borderBottomWidth: 1,
        borderBottomColor: "#DDD",
    },
    // repeaterSelectContainer: {
    //     marginTop: 12,
    //     height: 160,
    //     flex: 1,
    //     alignItems: "center",
    //     justifyContent: "center",
    //     paddingHorizontal: 15, // Prevent elements from touching edges
    // },
    // repetearSelectInputContainer: {
    //     // flex: 1,
    //     // flexDirection: "row",
    //     // alignItems: "center",
    //     // justifyContent: "space-between",
    //     // width: "100%",
    //     flexDirection: "row",
    //     alignItems: "center",
    //     justifyContent: "flex-start", // Align to left
    //     width: "100%", // Ensures it stays within screen
    //     paddingVertical: 10,
    //     paddingHorizontal: 15,
    //     backgroundColor: "#F5F5F5",
    //     borderRadius: 8,
    //     marginBottom: 10,
    // },
    // repetearSelectInput: {
    //     height: 48,
    //     width: 180,
    //     fontSize: 16,
    //     color: "black",
    //     borderBottomWidth: 1,
    //     borderBottomColor: "#DDD",
    //     marginLeft: 10, // Ensures proper spacing between checkbox and input
    // },
    repeaterSelectContainer: {
        marginVertical: 12,
        marginBottom: 24,
        width: "100%",
        alignItems: "center",
        // justifyContent: "space-between",
        paddingHorizontal: 15,
        // backgroundColor: "#F5F5F5",
    },
    repetearSelectInputContainer: {
        flexDirection: "row",
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    repetearSelectInput: {
        // width: "60%", // Ensures input stays visible
        minWidth: 150, // Prevents shrinking to 0
        fontSize: 16,
        color: "black",
        borderBottomWidth: 1,
        borderBottomColor: "#DDD",
    },
});

export default ReminderScreen;
