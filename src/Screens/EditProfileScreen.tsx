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
import { ProfileContext } from "../providers/ProfileDataProvider";
import { Loader } from "./Loader";
import * as ImageManipulator from "expo-image-manipulator";
import { useUpdateProfile } from "../api/profiles";
import { useNavigation } from "@react-navigation/native";

import * as DocumentPicker from "expo-document-picker";
import { useActionSheet } from "@expo/react-native-action-sheet";

export const EditProfileScreen = () => {
    const { userProfile } = useContext(ProfileContext);
    const { mutate: updateProfile, isPending: updatingProfile } =
        useUpdateProfile();
    const navigation = useNavigation();

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

    // Refs for autofocusing next input
    const lastNameRef = useRef<TextInput>(null);
    const usernameRef = useRef<TextInput>(null);
    const phoneNumberRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);

    const { showActionSheetWithOptions } = useActionSheet();

    const requestPermission = async () => {
        const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== "granted") {
            Alert.alert(
                "Permission Required",
                "Please allow access to your media library to pick an image."
            );
            return false;
        }
        return true;
    };

    const handlePickImage = async () => {
        const hasPermission = await requestPermission();
        if (!hasPermission) {
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            base64: false, // important: false here, we will get base64 after cropping
            quality: 1,
        });

        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];

            const cropSize = Math.min(asset.width ?? 0, asset.height ?? 0);

            if (!asset.uri || cropSize === 0) {
                console.warn("No valid image selected.");
                return;
            }

            // Perform cropping
            const manipulated = await ImageManipulator.manipulateAsync(
                asset.uri,
                [
                    {
                        crop: {
                            originX: (asset.width! - cropSize) / 2, // center crop horizontally
                            originY: (asset.height! - cropSize) / 2, // center crop vertically
                            width: cropSize,
                            height: cropSize,
                        },
                    },
                ],
                {
                    compress: 0.7,
                    format: ImageManipulator.SaveFormat.JPEG,
                    base64: true, // after manipulation
                }
            );

            if (!manipulated.base64) {
                console.warn("Cropping succeeded but no base64 found.");
                return;
            }

            // Now you have the cropped and compressed image as base64
            setAvatarUrl(`data:image/jpeg;base64,${manipulated.base64}`);
        }
    };

    const handleUpdateChanges = async () => {
        if (firstName.trim().length === 0 || lastName.trim().length === 0) {
            Alert.alert("Your name(s) can't be empty");
            return;
        }

        if (password.trim() !== confirmPassword.trim()) {
            Alert.alert("Your pass doesn't match!");
            return;
        }

        // password update is missing
        updateProfile(
            {
                profile: {
                    ...userProfile,
                    avatar_url: avatarUrl ?? "", // updated avatar
                    first_name: firstName, // updated first name
                    last_name: lastName, // updated last name
                    username: username, // updated username
                    phone_number: phoneNumber, // updated phone number
                },
                userId: userProfile.id,
            },
            {
                onSuccess: () => {
                    console.log("Profile updated successfully!");
                    navigation.goBack();
                },
                onError: (error: any) => {
                    console.warn("🚨 Error updating Profile:", error);
                },
            }
        );
    };

    const handlePickAnyFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
            });

            // @ts-ignore
            if (result.type === "success") {
                // @ts-ignore
                if (result.mimeType?.startsWith("image/")) {
                    // @ts-ignore
                    setAvatarUrl(result.uri);
                } else {
                    Alert.alert(
                        "Only images are supported for profile pictures."
                    );
                }
            }
        } catch (error) {
            console.warn("Document picker error:", error);
        }
    };

    const handleDeleteAvatar = () => {
        Alert.alert(
            "Delete Profile Picture",
            "Are you sure you want to remove your profile picture?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => setAvatarUrl(null),
                },
            ]
        );
    };

    const handleAvatarOptions = () => {
        const options = [
            "Change Photo",
            "Pick from Files",
            "Remove Photo",
            "Cancel",
        ];
        const destructiveButtonIndex = 2;
        const cancelButtonIndex = 3;

        showActionSheetWithOptions(
            {
                options,
                cancelButtonIndex,
                destructiveButtonIndex,
                title: "Profile Picture",
            },
            (buttonIndex) => {
                if (buttonIndex === 0) {
                    handlePickImage();
                } else if (buttonIndex === 1) {
                    handlePickAnyFile();
                } else if (buttonIndex === 2) {
                    handleDeleteAvatar();
                }
            }
        );
    };

    if (updatingProfile) {
        return <Loader text="Updating your profile..." />;
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.header}>Edit profile</Text>

                    <View style={styles.avatarSection}>
                        <Pressable onPress={handleAvatarOptions}>
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
                        onPress={handleUpdateChanges}
                    >
                        <Text style={styles.saveButtonText}>
                            Update profile
                        </Text>
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
    /////// avatar
    pickFromFilesText: {
        marginTop: 4,
        fontSize: 13,
        color: "#007bff",
        textAlign: "center",
    },

    deleteAvatarText: {
        marginTop: 4,
        fontSize: 13,
        color: "red",
        textAlign: "center",
    },
});
