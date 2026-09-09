import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { Button, Card, FormField, Screen, SectionHeader, SelectField } from "../../components/ui";
import { COUNTRY_CALLING_CODES, splitStoredPhone } from "../../data/countryCallingCodes";
import { usePreferences } from "../../i18n/PreferencesProvider";
import { RootStackParamList } from "../../navigation/types";
import { system } from "../../powersync/PowerSync";
import { useAuth } from "../../providers/AuthProvider";
import { useConnectivity } from "../../providers/ConnectivityProvider";
import { spacing } from "../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "ProfileEdit">;

export default function ProfileEditScreen({ navigation }: Props) {
    const { userId, profile, session, changePassword } = useAuth();
    const { isOnline } = useConnectivity();
    const { t } = usePreferences();
    const [fullName, setFullName] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [countryCode, setCountryCode] = useState("+49");
    const [phone, setPhone] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [passwordBusy, setPasswordBusy] = useState(false);

    useEffect(() => {
        setFullName(profile?.full_name ?? "");
        setFirstName(profile?.first_name ?? "");
        setLastName(profile?.last_name ?? "");
        setUsername(profile?.username ?? "");
        const parsedPhone = splitStoredPhone(profile?.phone_number ?? "", profile?.phone_country_code);
        setCountryCode(parsedPhone.countryCode);
        setPhone(parsedPhone.nationalNumber);
    }, [profile]);

    const submit = async () => {
        if (!userId || !fullName.trim()) {
            Alert.alert(t("personalInformation"), t("requiredFields"));
            return;
        }
        setBusy(true);
        try {
            const nationalNumber = phone.replace(/[^0-9]/gu, "");
            await system.db
                .updateTable("profiles")
                .set({
                    full_name: fullName.trim(),
                    first_name: firstName.trim() || null,
                    last_name: lastName.trim() || null,
                    username: username.trim() || null,
                    phone_country_code: nationalNumber ? countryCode : null,
                    phone_number: nationalNumber || null,
                    updated_at: new Date().toISOString(),
                })
                .where("id", "=", userId)
                .execute();
            Alert.alert(t("profileSaved"));
            navigation.goBack();
        } catch (error) {
            Alert.alert(t("personalInformation"), (error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const submitPassword = async () => {
        if (!isOnline) {
            Alert.alert(t("accountSecurity"), t("passwordChangeOnline"));
            return;
        }
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            Alert.alert(t("accountSecurity"), t("requiredFields"));
            return;
        }
        if (newPassword.length < 8) {
            Alert.alert(t("accountSecurity"), t("passwordTooShort"));
            return;
        }
        if (newPassword !== confirmNewPassword) {
            Alert.alert(t("accountSecurity"), t("passwordsMismatch"));
            return;
        }
        setPasswordBusy(true);
        try {
            await changePassword(currentPassword, newPassword);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            Alert.alert(t("passwordChanged"));
        } catch {
            Alert.alert(t("accountSecurity"), t("passwordUpdateFailed"));
        } finally {
            setPasswordBusy(false);
        }
    };

    return (
        <Screen>
            <SectionHeader title={t("personalInformation")} />
            <Card style={styles.form}>
                <FormField label={t("fullName")} value={fullName} onChangeText={setFullName} autoCapitalize="words" required />
                <FormField label={t("firstName")} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
                <FormField label={t("lastName")} value={lastName} onChangeText={setLastName} autoCapitalize="words" />
                <FormField label={t("username")} value={username} onChangeText={setUsername} autoCapitalize="none" />
                <SelectField label={t("countryCode")} value={countryCode} onChange={setCountryCode} options={COUNTRY_CALLING_CODES} />
                <FormField label={t("phoneNumber")} value={phone} onChangeText={(value) => setPhone(value.replace(/[^0-9]/gu, ""))} keyboardType="phone-pad" />
                <FormField label={t("email")} value={session?.user.email ?? ""} editable={false} hint={t("emailManagedByAccount")} />
            </Card>
            <Button label={t("save")} icon="checkmark" onPress={submit} loading={busy} />

            <SectionHeader title={t("accountSecurity")} />
            <Card style={styles.form}>
                <FormField label={t("currentPassword")} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="password" />
                <FormField label={t("newPassword")} value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" />
                <FormField label={t("confirmNewPassword")} value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" />
            </Card>
            <Button label={t("changePassword")} icon="lock-closed-outline" variant="secondary" onPress={submitPassword} loading={passwordBusy} />
        </Screen>
    );
}

const styles = StyleSheet.create({
    form: { gap: spacing.lg },
});
