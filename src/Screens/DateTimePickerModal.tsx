import { useState } from "react";
import { Alert, Modal, Pressable, View, Text, StyleSheet } from "react-native";
import DateTimePicker, {
    DateType,
    useDefaultStyles,
} from "react-native-ui-datepicker";

export const DateTimePickerModal = (props: any) => {
    const {
        modalVisible,
        setModalVisible,
        selectedDueDate,
        selectedDateTime,
        selectedDate,
        setSelectedDateTime,
        setSelectedDate,
        setSelectedTime,
        insuranceExpenseScreen,
        setSelectedDueDate,
        setIsValidUntilButtonPressed,
        isValidUntilButtonPressed,
    } = props;
    const defaultStyles = useDefaultStyles();

    function handleDateChange({ date }: { date?: DateType }) {
        // Automatically adapt to user's locale and timezone
        // @ts-ignore
        const formattedDate = date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });

        // @ts-ignore
        const formattedTime = date.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });

        if (insuranceExpenseScreen && insuranceExpenseScreen !== true) {
            setSelectedDate(formattedDate);
            setSelectedTime(formattedTime);
            setSelectedDateTime(date);
        }

        if (isValidUntilButtonPressed) {
            setSelectedDateTime(date);
            setSelectedDueDate(formattedDate);
            setIsValidUntilButtonPressed(false);
        } else {
            setSelectedDateTime(date);
            setSelectedDate(formattedDate);
        }
    }

    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
                Alert.alert("Modal has been closed.");
                setModalVisible(!modalVisible);
            }}
        >
            {/* Press anywhere outside modal to close */}
            <Pressable
                style={styles.modalOverlay}
                onPress={() => setModalVisible(false)} // ✅ Close when tapping outside
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <DateTimePicker
                            mode="single"
                            date={selectedDateTime}
                            onChange={handleDateChange}
                            timePicker={!insuranceExpenseScreen ? true : false} // ✅ Enables both Date & Time selection
                            styles={{
                                ...defaultStyles,
                                today: {
                                    borderColor: "#00AFCF",
                                    borderWidth: 2,
                                },
                                selected: {
                                    backgroundColor: "#00AFCF",
                                },
                                selected_label: { color: "white" },
                                header: {
                                    // color: "white",
                                    width: 300,
                                },
                            }}
                        />

                        <View style={styles.modalButtonsContainer}>
                            {/* confirm button */}
                            <Pressable
                                style={styles.confirmButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.confirmButtonText}>
                                    Confirm
                                </Text>
                            </Pressable>

                            {/* close button */}
                            <Pressable
                                style={styles.closeButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.closeButtonText}>
                                    Close
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    // Modal styles
    modalOverlay: {
        flex: 1,
        width: "100%",
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "85%",
        height: "60%",
        backgroundColor: "white",
        padding: 20,
        borderRadius: 15,
        alignItems: "center",
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    modalButtonsContainer: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
    },

    confirmButton: {
        marginTop: 15,
        paddingVertical: 12,
        paddingHorizontal: 30,
        backgroundColor: "#00AFCF",
        borderRadius: 8,
    },

    confirmButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    closeButton: {
        marginTop: 15,
        paddingVertical: 12,
        paddingHorizontal: 30,
        backgroundColor: "#00AFCF",
        borderRadius: 8,
    },

    closeButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
});
