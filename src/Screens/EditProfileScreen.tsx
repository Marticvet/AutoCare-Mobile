import React, { useContext, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    Pressable,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { ProfileContext } from "../providers/ProfileDataProvider";
import { Loader } from "./Loader";

export const EditProfileScreen = () => {
    const { userProfile } = useContext(ProfileContext);

    if (!userProfile) {
        return <Loader text="Your profile's data is loading..." />;
    }

    const [avatarUrl, setAvatarUrl] = useState<string | null>(
        userProfile.avatar_url
    );
    const [firstName, setFirstName] = useState(userProfile?.first_name || "");
    const [lastName, setLastName] = useState(userProfile?.last_name || "");
    const [email] = useState(userProfile?.email || "");
    const [username, setUsername] = useState(userProfile.username || "");
    const [phoneNumber, setPhoneNumber] = useState(
        userProfile.phone_number || ""
    );

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Refs for autofocusing next input
    const lastNameRef = useRef<TextInput>(null);
    const usernameRef = useRef<TextInput>(null);
    const phoneNumberRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled && result.assets.length > 0) {
            const image = result.assets[0];
            const filePath = `avatars/${Date.now()}.jpg`;

            const response = await fetch(image.uri);
            const blob = await response.blob();

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, blob, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (uploadError) {
                Alert.alert("Upload failed", uploadError.message);
                return;
            }

            const { data } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);

            setAvatarUrl(data.publicUrl);
        }
    };

    const handleSaveChanges = async () => {
        setLoading(true);

        const {
            data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;
        if (!user) {
            setLoading(false);
            return Alert.alert("Error", "User not authenticated");
        }

        if (password && password !== confirmPassword) {
            setLoading(false);
            return Alert.alert("Password Mismatch", "Passwords do not match.");
        }

        const { error } = await supabase
            .from("profiles")
            .update({
                avatar_url: avatarUrl,
                first_name: firstName,
                last_name: lastName,
                username: username,
                phone_number: phoneNumber,
            })
            .eq("id", user.id);

        if (error) {
            setLoading(false);
            return Alert.alert("Failed to update profile", error.message);
        }

        if (password) {
            const { error: passwordError } = await supabase.auth.updateUser({
                password,
            });
            if (passwordError) {
                setLoading(false);
                return Alert.alert(
                    "Failed to update password",
                    passwordError.message
                );
            }
        }

        setLoading(false);
        Alert.alert("Success", "Profile updated successfully");
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.header}>Edit profile</Text>

                    <View style={styles.avatarSection}>
                        <Pressable onPress={handlePickImage}>
                            <View style={styles.avatarWrapper}>
                                <Image
                                    source={{
                                        uri:
                                            avatarUrl &&
                                            avatarUrl !== "avatar_url"
                                                ? avatarUrl
                                                : "https://avatars.githubusercontent.com/u/1?v=4",
                                    }}
                                    style={styles.avatar}
                                />
                                <Ionicons
                                    name="camera"
                                    size={20}
                                    color="white"
                                    style={styles.cameraIcon}
                                />
                            </View>
                            <Text style={styles.changePhotoText}>
                                Change photo
                            </Text>
                        </Pressable>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About you</Text>

                        <View style={styles.field}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={[styles.input, styles.inputDisabled]}
                                value={email}
                                editable={false}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>First Name</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    focusedField === "first" &&
                                        styles.inputFocused,
                                ]}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="Enter your first name"
                                returnKeyType="next"
                                onFocus={() => setFocusedField("first")}
                                onBlur={() => setFocusedField(null)}
                                onSubmitEditing={() =>
                                    lastNameRef.current?.focus()
                                }
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Last Name</Text>
                            <TextInput
                                ref={lastNameRef}
                                style={[
                                    styles.input,
                                    focusedField === "last" &&
                                        styles.inputFocused,
                                ]}
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Enter your last name"
                                returnKeyType="next"
                                onFocus={() => setFocusedField("last")}
                                onBlur={() => setFocusedField(null)}
                                onSubmitEditing={() =>
                                    usernameRef.current?.focus()
                                }
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Username</Text>
                            <TextInput
                                ref={usernameRef}
                                style={[
                                    styles.input,
                                    focusedField === "username" &&
                                        styles.inputFocused,
                                ]}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="Enter your username"
                                returnKeyType="next"
                                onFocus={() => setFocusedField("username")}
                                onBlur={() => setFocusedField(null)}
                                onSubmitEditing={() =>
                                    phoneNumberRef.current?.focus()
                                }
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                ref={phoneNumberRef}
                                style={[
                                    styles.input,
                                    focusedField === "phone" &&
                                        styles.inputFocused,
                                ]}
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                placeholder="Enter your phone number"
                                keyboardType="phone-pad"
                                returnKeyType="next"
                                onFocus={() => setFocusedField("phone")}
                                onBlur={() => setFocusedField(null)}
                                onSubmitEditing={() =>
                                    passwordRef.current?.focus()
                                }
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.passwordWrapper}>
                                <TextInput
                                    ref={passwordRef}
                                    style={[
                                        styles.input,
                                        styles.passwordInput,
                                        focusedField === "pass" &&
                                            styles.inputFocused,
                                    ]}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="New password"
                                    secureTextEntry={!showPassword}
                                    onFocus={() => setFocusedField("pass")}
                                    onBlur={() => setFocusedField(null)}
                                    returnKeyType="next"
                                    onSubmitEditing={() =>
                                        confirmPasswordRef.current?.focus()
                                    }
                                />
                                <Pressable
                                    onPress={() =>
                                        setShowPassword((prev) => !prev)
                                    }
                                >
                                    <Ionicons
                                        name={showPassword ? "eye-off" : "eye"}
                                        size={20}
                                        color="#888"
                                    />
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.passwordWrapper}>
                                <TextInput
                                    ref={confirmPasswordRef}
                                    style={[
                                        styles.input,
                                        styles.passwordInput,
                                        focusedField === "confirm" &&
                                            styles.inputFocused,
                                    ]}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Confirm password"
                                    secureTextEntry={!showConfirmPassword}
                                    onFocus={() => setFocusedField("confirm")}
                                    onBlur={() => setFocusedField(null)}
                                />
                                <Pressable
                                    onPress={() =>
                                        setShowConfirmPassword((prev) => !prev)
                                    }
                                >
                                    <Ionicons
                                        name={
                                            showConfirmPassword
                                                ? "eye-off"
                                                : "eye"
                                        }
                                        size={20}
                                        color="#888"
                                    />
                                </Pressable>
                            </View>
                        </View>
                    </View>

                    <Pressable
                        style={styles.saveButton}
                        onPress={handleSaveChanges}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.saveButtonText}>
                                Update profile
                            </Text>
                        )}
                    </Pressable>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 150,
        backgroundColor: "#fff",
    },
    header: {
        fontSize: 20,
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 20,
    },
    avatarSection: {
        alignItems: "center",
        marginBottom: 20,
    },
    avatarWrapper: {
        width: 90,
        height: 90,
        borderRadius: 45,
        overflow: "hidden",
        position: "relative",
    },
    avatar: {
        width: "100%",
        height: "100%",
    },
    cameraIcon: {
        position: "absolute",
        bottom: 5,
        right: 5,
        backgroundColor: "#000",
        padding: 5,
        borderRadius: 12,
    },
    changePhotoText: {
        marginTop: 8,
        fontSize: 14,
        color: "#333",
        textAlign: "center",
    },
    section: {
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 14,
        color: "#888",
        marginBottom: 10,
        fontWeight: "500",
    },
    field: {
        marginBottom: 15,
    },
    label: {
        fontSize: 13,
        color: "#666",
        marginBottom: 5,
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
        fontSize: 16,
        paddingVertical: 6,
    },
    inputDisabled: {
        opacity: 0.4,
    },
    inputFocused: {
        borderBottomColor: "#00afcf",
    },
    passwordWrapper: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    passwordInput: {
        flex: 1,
        marginRight: 8,
    },
    saveButton: {
        backgroundColor: "#00afcf",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 30,
    },
    saveButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
});
