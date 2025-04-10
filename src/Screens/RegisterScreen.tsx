import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Pressable,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { supabase } from "../lib/supabase";

// import * as Linking from "expo-linking";

interface RegisterFormInterface {
    email: string;
    full_name: string;
    password: string;
    confirmPassword: string;
}

function RegisterScreen() {
    // const { authState, login, logout } = useAuth();
    const navigation = useNavigation();
    const [registerForm, setRegisterForm] = useState<RegisterFormInterface>({
        email: "",
        password: "",
        confirmPassword: "",
        full_name: "",
    });

    async function submitRegisterFormHandler() {
        const { email, password, confirmPassword, full_name } = registerForm;

        if (
            email.trim().length === 0 ||
            password.trim().length === 0 ||
            confirmPassword.trim().length === 0 ||
            full_name.trim().length === 0
        ) {
            Alert.alert("There's empty field. Please fill all fields!");

            // Reset form and show alert
            setRegisterForm({
                ...registerForm,
                password: "",
                confirmPassword: "",
            });
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Your password doesn't match!");

            // Reset form and show alert
            setRegisterForm({
                ...registerForm,
                password: "",
                confirmPassword: "",
            });
            return;
        }

        const {
            error,
            data: { user },
        } = await supabase.auth.signUp({
            email: "martigiant@gmail.com",
            password: "Marticvet",
        });

        if (error) {
            Alert.alert(error.message);

            // Reset form and show alert
            setRegisterForm({
                ...registerForm,
                password: "",
                confirmPassword: "",
            });
            return;
        }

        if (user !== null) {
            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                    email: "martigiant@gmail.com",
                    full_name: "Martin Tsvetanov",
                    avatar_url: "avatar_url",
                })
                .eq("id", user.id);

            if (profileError) {
                console.log("profile error: " + profileError.message);
            } else {
                console.log("Profile inserted successfully!");
            }
        }
    }

    function registerFormHandler(field: string, value: string) {
        setRegisterForm((oldState) => {
            return {
                ...oldState,
                [field]: value,
            };
        });
    }

    function navigateCreateAcountHandler() {
        // Reset the navigation stack and navigate to the Register screen
        navigation.dispatch(
            CommonActions.reset({
                index: 0, // this will set the first screen in the stack (only Register screen)
                routes: [
                    { name: "Login" }, // replace 'Register' with your registration screen name
                ],
            })
        );
    }

    async function forgotPasswordHandler() {
        // const resetPasswordURL = Linking.createURL("/LoginScreen");

        // const { data, error } = await supabase.auth.resetPasswordForEmail("martigiant@gmail.com", {
        //   redirectTo: resetPasswordURL,
        // });
      
        // return { data, error };
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.appContainer}
            keyboardVerticalOffset={10}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.innerKeyboardContainer}>
                    <View style={styles.registerContainer}>
                        <View style={styles.registerLabelContainer}>
                            <Text style={styles.registerLabelContainerTop}>
                                Register
                                {/* Create new Account */}
                            </Text>
                            <Text style={styles.registerLabelContainerBottm}>
                                Sign up to continue...
                            </Text>
                        </View>

                        <View style={styles.registerInformationContainer}>
                            <Text style={styles.registerTextLabel}>
                                Email Address
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="example@domain.com"
                                placeholderTextColor="#aaa"
                                onChangeText={(value) =>
                                    registerFormHandler("email", value)
                                }
                                value={registerForm.email}
                                autoCorrect={false}
                                autoCapitalize="none"
                                clearButtonMode={"always"}
                            />

                            <Text style={styles.registerTextLabel}>
                                Password
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                secureTextEntry={true}
                                placeholder="Enter your password"
                                placeholderTextColor="#aaa"
                                onChangeText={(value) =>
                                    registerFormHandler("password", value)
                                }
                                value={registerForm.password}
                                clearButtonMode={"always"}
                                textContentType={"oneTimeCode"}
                            />

                            <Text style={styles.registerTextLabel}>
                                Confirm Password
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Confirm your password"
                                placeholderTextColor="#aaa"
                                onChangeText={(value) =>
                                    registerFormHandler(
                                        "confirmPassword",
                                        value
                                    )
                                }
                                value={registerForm.confirmPassword}
                                secureTextEntry={true}
                                clearButtonMode={"always"}
                                textContentType={"oneTimeCode"}
                            />

                            <Text style={styles.registerTextLabel}>
                                Full Name
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter your full name"
                                placeholderTextColor="#aaa"
                                onChangeText={(value) =>
                                    registerFormHandler("full_name", value)
                                }
                                value={registerForm.full_name}
                                clearButtonMode={"always"}
                            />
                        </View>

                        <View style={styles.buttonContainer}>
                            <Pressable
                                onPress={submitRegisterFormHandler}
                                style={({ pressed }) =>
                                    pressed
                                        ? styles.pressedRegisterButton
                                        : styles.registerButton
                                }
                            >
                                <Text style={styles.registerButtonText}>
                                    Register
                                </Text>
                            </Pressable>

                            <View style={styles.registerOptionContainer}>
                                <Text style={styles.registerOuterText}>
                                    Do you have an account?
                                </Text>
                                <Text
                                    style={styles.registerInnerText}
                                    onPress={navigateCreateAcountHandler}
                                >
                                    Sign In
                                </Text>
                            </View>

                            <View style={styles.forgetPasswordContainer}>
                                <Text
                                    style={styles.text}
                                    onPress={forgotPasswordHandler}
                                >
                                    Forgot password?
                                </Text>
                            </View>
                        </View>

                        <View style={styles.registerInsideContainer}>
                            <View style={styles.registerWithContainer}>
                                <View style={styles.dividerContainer}>
                                    <View style={styles.line} />
                                    <Text style={styles.text}>
                                        OR SIGN UP WITH
                                    </Text>
                                    <View style={styles.line} />
                                </View>

                                <View style={styles.loginIcons}>
                                    <View style={styles.loginIcon}>
                                        <Entypo
                                            name="facebook"
                                            size={28}
                                            color="white"
                                        />
                                    </View>

                                    <View style={styles.loginIcon}>
                                        <AntDesign
                                            name="google"
                                            size={28}
                                            color="white"
                                        />
                                    </View>

                                    <View style={styles.loginIcon}>
                                        <AntDesign
                                            name="apple1"
                                            size={28}
                                            color="white"
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const whiteColor = "white";

const styles = StyleSheet.create({
    appContainer: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: "#212640",
    },
    innerKeyboardContainer: {
        flex: 1,
    },
    registerContainer: {
        justifyContent: "center",
        flex: 1,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
        paddingHorizontal: 24,
    },
    registerInformationContainer: {
        // height: 168,
        width: "100%",
        alignItems: "center",
        justifyContent: "space-around",
    },
    registerTextLabel: {
        width: "100%",
        color: whiteColor,
        paddingLeft: 2,
    },
    textInput: {
        width: "100%",
        color: whiteColor,
        backgroundColor: "#4B4D5C",
        borderRadius: 12,
        height: 42,
        paddingLeft: 8,
        marginBottom: 8,
        marginTop: 4,
    },
    registerLabelContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
    },
    registerLabelContainerTop: {
        fontSize: 48,
        fontWeight: "600",
        color: whiteColor,
    },
    registerLabelContainerBottm: {
        fontSize: 16,
        color: whiteColor,
        fontWeight: "400",
    },
    buttonContainer: {
        marginTop: 24,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    registerButton: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: 42,
        backgroundColor: "#4942CD",
        borderRadius: 12,
    },
    pressedRegisterButton: {
        backgroundColor: "#625be7",
        width: "100%",
        height: 42,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
    },
    registerButtonText: {
        fontSize: 28,
        color: whiteColor,
        fontWeight: 500,
    },
    registerInsideContainer: {
        borderRadius: 12,
    },
    registerOptionContainer: {
        alignItems: "center",
        justifyContent: "space-between",
        width: 238,
        flexDirection: "row",
        marginTop: 32,
    },
    registerOuterText: {
        fontSize: 16,
        color: "white",
    },
    registerInnerText: {
        fontSize: 16,
        // color: "#6b6e82",
        color: "#CCCCCC",
    },
    registerWithContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 32,
    },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 16, // Adjust for spacing
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: "#ccc", // Adjust for line color
        marginHorizontal: 8, // Adjust spacing around "or"
    },
    loginIcons: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
        paddingTop: 16,
    },
    loginIcon: {
        width: 68,
        height: 48,
        borderColor: "transparent",
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        fontSize: 16,
        color: whiteColor, // Adjust for text color
    },
    forgetPasswordContainer: {
        height: 40,
    },
});

export default RegisterScreen;
