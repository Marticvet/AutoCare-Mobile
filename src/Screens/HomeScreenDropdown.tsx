// HomeScreenDropdown.tsx
import React, { useContext, useState } from "react";
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Modal,
    FlatList,
} from "react-native";
import { ProfileContext } from "../providers/ProfileDataProvider";
import { useUpdateProfile } from "../api/profiles";

interface HomeScreenDropdownProps {
    data: string[];
    selectedValue: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
}

const HomeScreenDropdown: React.FC<HomeScreenDropdownProps> = ({
    data,
    selectedValue,
    onValueChange,
    placeholder = "Select an vehicle",
}) => {
    const [visible, setVisible] = useState(false);
    // Retrieve the values provided by ProfileDataProvider
    const {
        userProfile,
    } = useContext(ProfileContext);
    const userId = userProfile?.id;
    const {mutate: updateProfile} = useUpdateProfile();
    
    const handleSelect = (vehicleId: string) => {
        setVisible(false);

        if (!vehicleId || !userId) {
            console.warn("🚨 Missing required values. Cannot update vehicle.");
            return;
        }

        updateProfile(
            {
                // @ts-ignore
                profile: { ...userProfile, selected_vehicle_id: vehicleId },
                userId,
            },
            {
                onSuccess: () => {
                    console.log("Profile updated successfully!");
                },
                onError: (error) => {
                    console.warn("Error updating Profile:", error);
                },
            }
        );
    };

    return (
        <View style={styles.container}>
            <Pressable
                onPress={() => setVisible(true)}
                style={styles.input}
            >
                <Text style={styles.inputText}>
                    {selectedValue ? selectedValue : placeholder}
                </Text>
            </Pressable>

            <Modal transparent animationType="fade" visible={visible}>
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setVisible(false)}
                >
                    <View style={styles.HomeScreenDropdown}>
                        <FlatList
                            data={data}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={styles.HomeScreenDropdownItem}
                                    // @ts-ignore
                                    onPress={() => handleSelect(item.id)}
                                >
                                    <Text style={styles.itemText}>
                                        {item.vehicle_brand} | {item.vehicle_model} | {item.vehicle_license_plate}
                                    </Text>
                                </Pressable>
                            )}
                        />
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    input: {
        padding: 12,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 4,
        backgroundColor: "#fff",
    },
    inputText: {
        fontSize: 16,
        color: "#333",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    HomeScreenDropdown: {
        width: "80%",
        backgroundColor: "#fff",
        borderRadius: 4,
        maxHeight: 300,
        elevation: 5,
    },
    HomeScreenDropdownItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    itemText: {
        fontSize: 16,
        color: "#333",
    },
});

export default HomeScreenDropdown;
