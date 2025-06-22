import { LinearGradient } from "expo-linear-gradient";
import { PropsWithChildren } from "react";
import { StyleSheet } from "react-native";

export function LinearGradientExpenses({ children }: PropsWithChildren) {
    return (
        <LinearGradient
            colors={["#1458a6", "#1d6fd3", "#4b8ee5"]}
            style={styles.sections}
        >
            {children}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    ////////
    sections: {
        // backgroundColor: "white",
        marginTop: 16,
        backgroundColor: "#1467c6",
        borderRadius: 8,

        padding: 10,
        marginBottom: 10,
        // borderRadius: 5,
    },
});
