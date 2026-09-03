import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { useSubscription } from "../../billing/SubscriptionProvider";
import { releaseFeatures } from "../../config/releaseFeatures";
import { Button, Card, ChoiceChips, FormField, LoadingState, Row, Screen, SectionHeader, SelectField } from "../../components/ui";
import { useFleetBillingAccount, useGarageMemberships, useGarages, useMyPendingGarageInvitations } from "../../data/liveQueries";
import { RootStackParamList } from "../../navigation/types";
import { useSystem } from "../../powersync/PowerSync";
import { useAuth } from "../../providers/AuthProvider";
import { useGarage } from "../../providers/GarageProvider";
import { colors, spacing, typography } from "../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Memberships">;
type MemberRole = "admin" | "driver" | "viewer";

export default function MembershipsScreen({ navigation }: Props) {
    const { userId } = useAuth();
    const { supabaseConnector } = useSystem();
    const {
        garages,
        activeGarage,
        activeGarageId,
        canManageMembers,
        currentRole,
        selectGarage,
    } = useGarage();
    const { data: allGarages } = useGarages(userId);
    const { data: members, loading } = useGarageMemberships(activeGarageId);
    const { data: invitations } = useMyPendingGarageInvitations(userId);
    const { data: fleetAccount } = useFleetBillingAccount(activeGarageId);
    const { hasFamily, hasFleet } = useSubscription();
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<MemberRole>("driver");
    const [garageName, setGarageName] = useState(activeGarage?.name ?? "");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setGarageName(activeGarage?.name ?? "");
    }, [activeGarage?.id, activeGarage?.name]);

    const invitationCards = useMemo(
        () => invitations.map((invitation) => ({
            invitation,
            garage: allGarages.find((garage) => garage.id === invitation.garage_id),
        })),
        [allGarages, invitations]
    );
    const activeMembers = members.filter((member) => member.status === "active");
    const pendingMembers = members.filter((member) => member.status === "pending");
    const isOwned = activeGarage?.owner_user_id === userId;
    const canInvite = Boolean(canManageMembers && activeGarage && activeGarage.kind !== "personal");

    const call = async (name: string, parameters: Record<string, unknown>, success?: string) => {
        setBusy(true);
        try {
            const { error: rpcError } = await supabaseConnector.client.rpc(name, parameters);
            if (rpcError) throw rpcError;
            if (success) Alert.alert("Garage", success);
            return true;
        } catch (caught) {
            Alert.alert("Garage", caught instanceof Error ? caught.message : "The request could not be completed.");
            return false;
        } finally {
            setBusy(false);
        }
    };

    const invite = async () => {
        if (!activeGarageId || !email.trim()) return;
        const sent = await call("invite_garage_member", {
            target_garage_id: activeGarageId,
            invite_email: email,
            invite_role: role,
        }, "Invitation created. It will appear for that person after they sign in with this email.");
        if (sent) setEmail("");
    };

    const accept = async (membershipId: string, garageId: string) => {
        if (await call("accept_garage_invitation", { target_membership_id: membershipId }, "Invitation accepted.")) {
            await selectGarage(garageId);
        }
    };

    const decline = (membershipId: string) => {
        Alert.alert("Decline invitation?", "You can only join later if another invitation is created.", [
            { text: "Cancel", style: "cancel" },
            { text: "Decline", style: "destructive", onPress: () => void call("decline_garage_invitation", { target_membership_id: membershipId }) },
        ]);
    };

    const remove = (membershipId: string, label: string) => {
        Alert.alert("Remove member?", `${label} will lose access to this garage.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: () => void call("remove_garage_member", { target_membership_id: membershipId }) },
        ]);
    };

    const chooseRole = (membershipId: string) => {
        Alert.alert("Member role", "Drivers can edit garage data. Viewers can only read it. Admins can also manage members.", [
            ...(["admin", "driver", "viewer"] as MemberRole[]).map((newRole) => ({
                text: roleLabel(newRole),
                onPress: () => void call("update_garage_member_role", { target_membership_id: membershipId, new_role: newRole }),
            })),
            { text: "Cancel", style: "cancel" as const },
        ]);
    };

    const rename = async () => {
        if (!activeGarageId || garageName.trim() === activeGarage?.name) return;
        await call("rename_garage", { target_garage_id: activeGarageId, new_name: garageName }, "Garage name updated.");
    };

    const openFleet = async () => {
        const url = process.env.EXPO_PUBLIC_FLEET_URL;
        if (!url) {
            Alert.alert("AutoCare Fleet", "Add EXPO_PUBLIC_FLEET_URL after the Fleet web checkout is published.");
            return;
        }
        await Linking.openURL(url);
    };

    if (!activeGarage && loading) return <Screen><LoadingState /></Screen>;

    return (
        <Screen>
            {invitationCards.length ? (
                <View style={styles.section}>
                    <SectionHeader title="Garage invitations" />
                    {invitationCards.map(({ invitation, garage }) => (
                        <Card key={invitation.id} style={styles.invitation}>
                            <Row
                                icon="mail-unread-outline"
                                tone="amber"
                                title={garage?.name ?? "Shared garage"}
                                subtitle={`Invited as ${roleLabel(invitation.role)}`}
                            />
                            <View style={styles.actions}>
                                <Button label="Decline" variant="ghost" compact onPress={() => decline(invitation.id)} />
                                <Button label="Accept" compact loading={busy} onPress={() => void accept(invitation.id, invitation.garage_id ?? "")} />
                            </View>
                        </Card>
                    ))}
                </View>
            ) : null}

            <View style={styles.section}>
                <SectionHeader title="Active garage" />
                {garages.length > 1 ? (
                    <SelectField
                        label="Garage"
                        value={activeGarageId}
                        onChange={(value) => void selectGarage(value)}
                        options={garages.map((garage) => ({ value: garage.id, label: garage.name ?? "Garage" }))}
                    />
                ) : null}
                <Card style={styles.planCard}>
                    <View style={styles.planIcon}>
                        <Ionicons name={activeGarage?.kind === "fleet" ? "business-outline" : activeGarage?.kind === "family" ? "people-outline" : "car-outline"} color={colors.primary} size={24} />
                    </View>
                    <View style={styles.grow}>
                        <Text style={styles.planName}>{activeGarage?.name ?? "My garage"}</Text>
                        <Text style={styles.planMeta}>{tierLabel(activeGarage?.kind)} · {roleLabel(currentRole)}</Text>
                    </View>
                </Card>
                {canManageMembers ? (
                    <Card style={styles.form}>
                        <FormField label="Garage name" value={garageName} onChangeText={setGarageName} maxLength={80} />
                        <Button label="Save name" variant="secondary" disabled={!garageName.trim() || garageName.trim() === activeGarage?.name} loading={busy} onPress={() => void rename()} />
                    </Card>
                ) : null}
            </View>

            {isOwned && activeGarage?.kind === "personal" ? (
                <Card style={styles.upgrade}>
                    <Text style={styles.upgradeTitle}>Share this garage with Family</Text>
                    <Text style={styles.upgradeBody}>Family includes every Plus feature and supports up to six people, including you.</Text>
                    <Button label={hasFamily ? "Family status is syncing" : "Compare Family plans"} icon="people-outline" onPress={() => navigation.navigate("Paywall", { source: "family" })} />
                </Card>
            ) : null}

            {canInvite ? (
                <View style={styles.section}>
                    <SectionHeader title="Invite a driver" />
                    <Card style={styles.form}>
                        <FormField label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} required />
                        <Text style={styles.label}>Role</Text>
                        <ChoiceChips value={role} onChange={setRole} options={[
                            { value: "driver", label: "Driver" },
                            { value: "viewer", label: "Viewer" },
                            { value: "admin", label: "Admin" },
                        ]} />
                        <Text style={styles.hint}>Drivers can edit records. Viewers cannot make changes. Admins can also invite and manage members.</Text>
                        <Button label="Create invitation" icon="person-add-outline" loading={busy} disabled={!email.trim()} onPress={() => void invite()} />
                    </Card>
                </View>
            ) : null}

            <View style={styles.section}>
                <SectionHeader title={`Members (${activeMembers.length}${activeGarage?.seat_limit ? `/${activeGarage.seat_limit}` : ""})`} />
                <Card style={styles.list}>
                    {activeMembers.map((member, index) => (
                        <View key={member.id}>
                            <Row
                                icon={member.role === "owner" ? "key-outline" : "person-outline"}
                                tone={member.role === "owner" ? "green" : "blue"}
                                title={member.display_name || member.email || "Member"}
                                subtitle={roleLabel(member.role)}
                                onPress={canManageMembers && member.role !== "owner" ? () => chooseRole(member.id) : undefined}
                            />
                            {canManageMembers && member.role !== "owner" ? (
                                <View style={styles.memberActions}>
                                    <Button label="Change role" compact variant="ghost" onPress={() => chooseRole(member.id)} />
                                    <Button label="Remove" compact variant="danger" onPress={() => remove(member.id, member.display_name || member.email || "Member")} />
                                </View>
                            ) : null}
                            {index < activeMembers.length - 1 ? <View style={styles.divider} /> : null}
                        </View>
                    ))}
                    {!activeMembers.length ? <Text style={styles.empty}>No active members are available yet.</Text> : null}
                </Card>
            </View>

            {canManageMembers && pendingMembers.length ? (
                <View style={styles.section}>
                    <SectionHeader title="Pending invitations" />
                    <Card style={styles.list}>
                        {pendingMembers.map((member) => (
                            <Row key={member.id} icon="time-outline" tone="amber" title={member.email ?? "Pending member"} subtitle={`${roleLabel(member.role)} · waiting for acceptance`} onPress={() => remove(member.id, member.email ?? "Pending member")} />
                        ))}
                    </Card>
                </View>
            ) : null}

            {releaseFeatures.fleetBilling ? (
                <View style={styles.section}>
                    <SectionHeader title="Fleet" />
                    <Card style={styles.fleetCard}>
                        <Text style={styles.upgradeTitle}>{activeGarage?.kind === "fleet" || hasFleet ? "Fleet workspace" : "Need a business workspace?"}</Text>
                        <Text style={styles.upgradeBody}>
                            {fleetAccount
                                ? `${fleetAccount.licensed_vehicles} vehicle licenses · ${fleetAccount.licensed_members} member licenses · ${fleetAccount.status}`
                                : "Fleet billing is handled on the web with vehicle and team-member licenses."}
                        </Text>
                        <Button label={fleetAccount ? "Manage Fleet billing" : "Learn about AutoCare Fleet"} icon="open-outline" variant="secondary" onPress={() => void openFleet()} />
                    </Card>
                </View>
            ) : null}
        </Screen>
    );
}

function roleLabel(role?: string | null) {
    if (!role) return "Member";
    return role.slice(0, 1).toUpperCase() + role.slice(1);
}

function tierLabel(kind?: string | null) {
    if (kind === "family") return "Family";
    if (kind === "fleet") return "Fleet";
    return "Personal";
}

const styles = StyleSheet.create({
    section: { gap: spacing.md },
    invitation: { gap: spacing.md, borderColor: colors.warning, borderWidth: 1 },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
    planCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    planIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
    grow: { flex: 1, minWidth: 0 },
    planName: { ...typography.heading, color: colors.ink },
    planMeta: { ...typography.caption, color: colors.inkMuted, marginTop: 3 },
    form: { gap: spacing.md },
    upgrade: { gap: spacing.md, backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 1 },
    fleetCard: { gap: spacing.md },
    upgradeTitle: { ...typography.heading, color: colors.ink },
    upgradeBody: { ...typography.body, color: colors.inkMuted },
    label: { ...typography.label, color: colors.ink },
    hint: { ...typography.caption, color: colors.inkMuted },
    list: { paddingVertical: spacing.sm },
    memberActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
    empty: { ...typography.body, color: colors.inkMuted, textAlign: "center", padding: spacing.lg },
});
