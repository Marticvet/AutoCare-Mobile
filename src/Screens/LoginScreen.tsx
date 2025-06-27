import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Pressable,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
} from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useSystem } from "../powersync/PowerSync";

interface LoginFormInterface {
    email: string;
    password: string;
}

function LoginScreen() {
    const { supabaseConnector } = useSystem();

    const navigation = useNavigation();
    const [loginForm, setLoginForm] = useState<LoginFormInterface>({
        // email: "martigiant2@gmail.com",
        // password: "Marticvet",
        email: "",
        password: "",
    });

    async function submitLoginFormHandler() {
        const { email, password } = loginForm;

        await supabaseConnector.login(
            // email: email,
            // password,
            "martigiant@gmail.com",
            "Marticvet"
        );

        // if (error) Alert.alert(error.message);

        setLoginForm({
            email: "",
            password: "",
        });
    }

    function loginFormHandler(field: string, value: string) {
        setLoginForm((oldState) => {
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
                    { name: "Register" }, // replace 'Register' with your registration screen name
                ],
            })
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.container}
            keyboardVerticalOffset={20}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.innerKeyboardContainer}>
                    <View style={styles.loginContainer}>
                        <View style={styles.loginLabelContainer}>
                            <Text style={styles.loginLabelContainerTop}>
                                Login
                            </Text>
                            <Text style={styles.loginLabelContainerBottm}>
                                Sign in to continue.
                            </Text>
                        </View>

                        <View style={styles.loginInformationContainer}>
                            <Text style={styles.loginTextLabel}>
                                Email Address
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="example@domain.com"
                                placeholderTextColor="#aaa"
                                onChangeText={(value) =>
                                    loginFormHandler("email", value)
                                }
                                value={loginForm.email}
                                autoCorrect={false}
                                autoCapitalize="none"
                                clearButtonMode={"always"}
                            />

                            <Text style={styles.loginTextLabel}>Password</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter your password"
                                placeholderTextColor="#aaa"
                                onChangeText={(value) =>
                                    loginFormHandler("password", value)
                                }
                                value={loginForm.password}
                                secureTextEntry={true}
                                clearButtonMode={"always"}
                                textContentType={"oneTimeCode"}
                            />
                        </View>

                        <View style={styles.buttonContainer}>
                            <Pressable
                                onPress={submitLoginFormHandler}
                                style={({ pressed }) =>
                                    pressed
                                        ? styles.pressedLoginButton
                                        : styles.loginButton
                                }
                            >
                                <Text style={styles.loginButtonText}>
                                    Login
                                </Text>
                            </Pressable>

                            <View style={styles.registerOptionContainer}>
                                <Text style={styles.registerOuterText}>
                                    Don't have an account?
                                </Text>
                                <Text
                                    style={styles.registerInnerText}
                                    onPress={navigateCreateAcountHandler}
                                >
                                    Sign Up
                                </Text>
                            </View>
                        </View>

                        <View style={styles.loginInsideContainer}>
                            <View style={styles.loginWithContainer}>
                                <View style={styles.dividerContainer}>
                                    <View style={styles.line} />
                                    <Text style={styles.text}>
                                        OR SIGN IN WITH
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
    container: {
        flex: 1,
        justifyContent: "center",
        // backgroundColor: whiteColor,
        backgroundColor: "#212640",
    },
    innerKeyboardContainer: {
        flex: 1,
    },
    topContainer: {},
    loginContainer: {
        justifyContent: "center",
        flex: 1,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
        paddingHorizontal: 24,
    },
    loginInformationContainer: {
        height: 142,
        width: "100%",
        alignItems: "center",
        justifyContent: "space-around",
    },
    loginTextLabel: {
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
    },
    loginLabelContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
    },
    loginLabelContainerTop: {
        fontSize: 48,
        fontWeight: "600",
        color: whiteColor,
    },
    loginLabelContainerBottm: {
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
    loginButton: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: 42,
        backgroundColor: "#4942CD",
        borderRadius: 12,
    },
    pressedLoginButton: {
        backgroundColor: "#625be7",
        width: "100%",
        height: 42,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
    },
    loginButtonText: {
        fontSize: 28,
        color: whiteColor,
        fontWeight: 500,
    },
    loginInsideContainer: {
        borderRadius: 12,
    },
    registerOptionContainer: {
        alignItems: "center",
        justifyContent: "space-between",
        // width: "65%",
        width: 232,
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
    loginWithContainer: {
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
});

export default LoginScreen;
