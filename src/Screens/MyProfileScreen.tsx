import React, { useContext, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    Pressable,
    ScrollView,
    Switch,
} from "react-native";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { ProfileContext } from "../providers/ProfileDataProvider";
import { useAuth } from "../providers/AuthProvider";

export const MyProfileScreen = () => {
    const { userProfile } = useContext(ProfileContext);

    const { logout } = useAuth(); // Get logout function from AuthProvider
    const [pushEnabled, setPushEnabled] = useState(true);
    const [faceIdEnabled, setFaceIdEnabled] = useState(true);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Profile Header */}
            <View style={styles.profileSection}>
                <Image
                    source={{
                        uri:
                            userProfile?.avatar_url &&
                            userProfile.avatar_url !== "" &&
                            userProfile.avatar_url !== "avatar_url"
                                ? userProfile.avatar_url
                                : "https://avatars.githubusercontent.com/u/1?v=4",
                    }}
                    style={styles.avatar}
                />
                <Text style={styles.username}>
                    {userProfile?.first_name} {userProfile?.last_name}
                </Text>
                <Text style={styles.email}>{userProfile?.email}</Text>
                <Pressable style={styles.editProfileButton}>
                    <Text style={styles.editProfileText}>Edit profile</Text>
                </Pressable>
            </View>

            {/* Inventories Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Inventories</Text>

                <Pressable style={styles.item}>
                    <View style={styles.itemLeft}>
                        <Ionicons name="home-outline" size={22} color="#000" />
                        <Text style={styles.itemText}>My stores</Text>
                    </View>
                    <View style={styles.itemRight}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>2</Text>
                        </View>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color="#888"
                        />
                    </View>
                </Pressable>

                <Pressable style={styles.item}>
                    <View style={styles.itemLeft}>
                        <Ionicons
                            name="help-circle-outline"
                            size={22}
                            color="#000"
                        />
                        <Text style={styles.itemText}>Support</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#888" />
                </Pressable>
            </View>

            {/* Preferences Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferences</Text>

                <View style={styles.item}>
                    <View style={styles.itemLeft}>
                        <Ionicons
                            name="notifications-outline"
                            size={22}
                            color="#000"
                        />
                        <Text style={styles.itemText}>Push notifications</Text>
                    </View>
                    <Switch
                        value={pushEnabled}
                        onValueChange={setPushEnabled}
                        trackColor={{ false: "#ccc", true: "#00afcf" }}
                        thumbColor="#fff"
                    />
                </View>

                <View style={styles.item}>
                    <View style={styles.itemLeft}>
                        <MaterialIcons name="face" size={22} color="#000" />
                        <Text style={styles.itemText}>Face ID</Text>
                    </View>
                    <Switch
                        value={faceIdEnabled}
                        onValueChange={setFaceIdEnabled}
                        trackColor={{ false: "#ccc", true: "#00afcf" }}
                        thumbColor="#fff"
                    />
                </View>

                <Pressable style={styles.item}>
                    <View style={styles.itemLeft}>
                        <Feather name="lock" size={22} color="#000" />
                        <Text style={styles.itemText}>PIN Code</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#888" />
                </Pressable>

                <Pressable
                    style={styles.item}
                    onPress={() => {
                        logout(); // Call the logout function
                    }}
                >
                    <View style={styles.itemLeft}>
                        <Feather name="log-out" size={22} color="red" />
                        <Text style={[styles.itemText, { color: "red" }]}>
                            Logout
                        </Text>
                    </View>
                </Pressable>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 40,
        paddingHorizontal: 20,
        backgroundColor: "#fff",
    },
    profileSection: {
        alignItems: "center",
        marginBottom: 30,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#ccc",
    },
    username: {
        fontSize: 20,
        fontWeight: "600",
        marginTop: 12,
    },
    email: {
        fontSize: 14,
        color: "#888",
        marginBottom: 10,
    },
    editProfileButton: {
        backgroundColor: "#000",
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 10,
    },
    editProfileText: {
        color: "#fff",
        fontWeight: "500",
    },
    section: {
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        padding: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        color: "#666",
        marginBottom: 10,
        marginLeft: 5,
        fontWeight: "500",
    },
    item: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    itemLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    itemText: {
        fontSize: 16,
    },
    itemRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    badge: {
        backgroundColor: "#00afcf",
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    badgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
});
