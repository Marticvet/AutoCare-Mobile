import { Alert, Modal, Pressable, View, Text, StyleSheet } from "react-native";
import DateTimePicker, {
    DateType,
    useDefaultStyles,
} from "react-native-ui-datepicker";

export interface DateTimePickerModalProps {
    modalVisible: boolean;
    setModalVisible: (value: boolean) => void;

    selectedDateTime: DateType;
    setSelectedDateTime: (value: DateType) => void;

    selectedDate?: DateType;
    setSelectedDate?: (value: DateType) => void;

    setSelectedTime?: (value: DateType) => void;

    insuranceExpenseScreen?: boolean;
    isValidUntilButtonPressed?: boolean;
    setIsValidUntilButtonPressed?: (value: boolean) => void;

    selectedDueDate?: string | DateType;
    setSelectedDueDate?: (value: string) => void;
}

export const DateTimePickerModal = ({
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
}: DateTimePickerModalProps) => {
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
            setSelectedDate?.(formattedDate);
            setSelectedTime?.(formattedTime);
            setSelectedDateTime(date);
        }

        if (isValidUntilButtonPressed) {
            setSelectedDateTime(date);
            setSelectedDueDate?.(formattedDate);
            setIsValidUntilButtonPressed?.(false);
        } else {
            setSelectedDateTime(date);
            setSelectedDate?.(formattedDate);
        }

        setModalVisible(false);
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
            <View style={styles.modalOverlay}>
                {/* Only this Pressable is touch-sensitive for dismissing */}
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => setModalVisible(false)}
                />

                <View style={styles.modalContainer}>
                    <DateTimePicker
                        mode="single"
                        date={selectedDateTime}
                        onChange={handleDateChange}
                        timePicker={!insuranceExpenseScreen}
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
                                marginBottom: 32,
                                width: 300,
                            },
                        }}
                    />
                </View>
            </View>
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
        // height: "60%",
        height: "50%",
        backgroundColor: "white",
        padding: 20,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
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
