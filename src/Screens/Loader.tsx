import { ActivityIndicator, StyleSheet, View, Text } from "react-native";

export interface LoaderProps {
    text: string;
}

export function Loader({ text }: LoaderProps) {
    return (
        <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{text}</Text>
            <ActivityIndicator size="large" color="#6161ec" />
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginBottom: 20,
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
});
