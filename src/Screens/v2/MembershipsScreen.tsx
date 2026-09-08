import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { useSubscription } from "../../billing/SubscriptionProvider";
import { releaseFeatures } from "../../config/releaseFeatures";
import {
    Button,
    Card,
    ChoiceChips,
    FormField,
    LoadingState,
    Row,
    Screen,
    SectionHeader,
    SelectField,
} from "../../components/ui";
import {
    useFleetBillingAccount,
    useGarageMemberships,
    useGarages,
    useMyPendingGarageInvitations,
} from "../../data/liveQueries";
import { RootStackParamList } from "../../navigation/types";
import type { GarageMembership } from "../../powersync/AppSchema";
import { useSystem } from "../../powersync/PowerSync";
import { useAuth } from "../../providers/AuthProvider";
import { useGarage } from "../../providers/GarageProvider";
import { colors, spacing, typography } from "../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Memberships">;
type MemberRole = "admin" | "driver" | "viewer";
const confirmedGarageNames = new Map<string, string>();
const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function requestErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "object" && error && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string" && message.trim()) return message;
    }
    return fallback;
}

export default function MembershipsScreen({ navigation }: Props) {
    const { profile, userId } = useAuth();
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
    const { data: invitations } = useMyPendingGarageInvitations(userId);
    const { hasFamily, hasFleet, memberLimit } = useSubscription();
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState<string | null>(null);
    const [role, setRole] = useState<MemberRole>("driver");
    const rememberedGarageName = activeGarage?.id
        ? confirmedGarageNames.get(activeGarage.id)
        : undefined;
    const [garageName, setGarageName] = useState(rememberedGarageName ?? "");
    const [savedGarageName, setSavedGarageName] = useState<string | null>(rememberedGarageName ?? null);
    const [garageSnapshotResolved, setGarageSnapshotResolved] = useState(Boolean(rememberedGarageName));
    const [serverGarage, setServerGarage] = useState<{
        id: string;
        name: string | null;
        kind: string | null;
        seat_limit: number | null;
        owner_user_id: string | null;
    } | null>(null);
    const [serverMembers, setServerMembers] = useState<
        GarageMembership[] | null
    >(null);
    const [busy, setBusy] = useState(false);
    const resolvedGarageId = activeGarageId || serverGarage?.id || "";
    const { data: members, loading } = useGarageMemberships(resolvedGarageId);
    const { data: fleetAccount } = useFleetBillingAccount(resolvedGarageId);

    useEffect(() => {
        const rememberedName = activeGarage?.id
            ? confirmedGarageNames.get(activeGarage.id)
            : undefined;
        setGarageName(rememberedName ?? "");
        setSavedGarageName(rememberedName ?? null);
        setGarageSnapshotResolved(Boolean(rememberedName));
    }, [activeGarage?.id, activeGarage?.name]);

    const fetchGarageSnapshot = useCallback(async () => {
        if (!activeGarageId && !userId) return null;
        let garageQuery = supabaseConnector.client
            .from("garages")
            .select("id, name, kind, seat_limit, owner_user_id");
        garageQuery = activeGarageId
            ? garageQuery.eq("id", activeGarageId)
            : garageQuery.eq("owner_user_id", userId);
        const garageResult = await garageQuery.maybeSingle();
        if (garageResult.error) throw garageResult.error;
        const snapshotGarageId = garageResult.data?.id;
        if (!snapshotGarageId) return { garage: null, members: [] };
        const membershipResult = await supabaseConnector.client
            .from("garage_memberships")
            .select("*")
            .eq("garage_id", snapshotGarageId)
            .in("status", ["pending", "active"])
            .order("created_at");
        if (membershipResult.error) throw membershipResult.error;
        return {
            garage: garageResult.data,
            members: (membershipResult.data ?? []) as GarageMembership[],
        };
    }, [activeGarageId, supabaseConnector, userId]);

    const applyGarageSnapshot = useCallback(
        (snapshot: Awaited<ReturnType<typeof fetchGarageSnapshot>>) => {
            if (!snapshot) return;
            setServerGarage(snapshot.garage);
            setServerMembers(snapshot.members);
            if (snapshot.garage) {
                const confirmedName = snapshot.garage.name ?? "";
                if (confirmedName) confirmedGarageNames.set(snapshot.garage.id, confirmedName);
                setGarageName(confirmedName);
                setSavedGarageName(confirmedName || null);
            }
        },
        []
    );

    const refreshGarageSnapshot = useCallback(async () => {
        applyGarageSnapshot(await fetchGarageSnapshot());
    }, [applyGarageSnapshot, fetchGarageSnapshot]);

    useEffect(() => {
        let mounted = true;
        setServerGarage(null);
        setServerMembers(null);
        void fetchGarageSnapshot()
            .then((snapshot) => {
                if (mounted) applyGarageSnapshot(snapshot);
            })
            .catch(() => {
                if (!mounted) return;
                setGarageName(activeGarage?.name ?? "");
            })
            .finally(() => {
                if (mounted) setGarageSnapshotResolved(true);
            });
        return () => {
            mounted = false;
        };
    }, [activeGarage?.name, applyGarageSnapshot, fetchGarageSnapshot]);

    const invitationCards = useMemo(
        () =>
            invitations.map((invitation) => ({
                invitation,
                garage: allGarages.find(
                    (garage) => garage.id === invitation.garage_id
                ),
            })),
        [allGarages, invitations]
    );
    const displayedMembers = serverMembers ?? members;
    const activeMembers = displayedMembers.filter(
        (member) => member.status === "active"
    );
    const pendingMembers = displayedMembers.filter(
        (member) => member.status === "pending"
    );
    const isOwned =
        (serverGarage?.owner_user_id ?? activeGarage?.owner_user_id) === userId;
    const ownerMembershipMissing = Boolean(
        isOwned && !activeMembers.some((member) => member.role === "owner")
    );
    const activeMemberCount =
        activeMembers.length + (ownerMembershipMissing ? 1 : 0);
    const displayedGarageName =
        savedGarageName ??
        serverGarage?.name ??
        (garageSnapshotResolved ? activeGarage?.name : "") ??
        "";
    const sourceGarageKind = serverGarage?.kind ?? activeGarage?.kind;
    const displayedGarageKind =
        sourceGarageKind === "personal" && hasFamily
            ? "family"
            : sourceGarageKind;
    const canInvite = Boolean(
        canManageMembers &&
            (activeGarage || serverGarage) &&
            (displayedGarageKind !== "personal" || hasFamily || hasFleet)
    );
    const sourceSeatLimit =
        serverGarage?.seat_limit ?? activeGarage?.seat_limit;
    const displayedSeatLimit =
        displayedGarageKind === "family"
            ? memberLimit ?? sourceSeatLimit
            : sourceSeatLimit;

    const call = async (
        name: string,
        parameters: Record<string, unknown>,
        success?: string
    ) => {
        setBusy(true);
        try {
            const { error: rpcError } = await supabaseConnector.client.rpc(
                name,
                parameters
            );
            if (rpcError) throw rpcError;
            await refreshGarageSnapshot().catch(() => undefined);
            if (success) Alert.alert("Garage", success);
            return true;
        } catch (caught) {
            Alert.alert(
                "Garage",
                requestErrorMessage(
                    caught,
                    "The request could not be completed."
                )
            );
            return false;
        } finally {
            setBusy(false);
        }
    };

    const invite = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!resolvedGarageId) {
            Alert.alert(
                "Garage unavailable",
                "The garage is still loading. Check the connection and try again."
            );
            return;
        }
        if (!isValidEmail(normalizedEmail)) {
            setEmailError("Enter a valid email address.");
            return;
        }
        if (normalizedEmail === profile?.email?.trim().toLowerCase()) {
            setEmailError("You are already the owner of this garage.");
            return;
        }
        setEmailError(null);
        const sent = await call(
            "invite_garage_member",
            {
                target_garage_id: resolvedGarageId,
                invite_email: normalizedEmail,
                invite_role: role,
            },
            "Invitation created. It will appear for that person after they sign in with this email."
        );
        if (sent) {
            setEmail("");
            setEmailError(null);
        }
    };

    const accept = async (membershipId: string, garageId: string) => {
        if (
            await call(
                "accept_garage_invitation",
                { target_membership_id: membershipId },
                "Invitation accepted."
            )
        ) {
            await selectGarage(garageId);
        }
    };

    const decline = (membershipId: string) => {
        Alert.alert(
            "Decline invitation?",
            "You can only join later if another invitation is created.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Decline",
                    style: "destructive",
                    onPress: () =>
                        void call("decline_garage_invitation", {
                            target_membership_id: membershipId,
                        }),
                },
            ]
        );
    };

    const remove = (membershipId: string, label: string) => {
        Alert.alert(
            "Remove member?",
            `${label} will lose access to this garage.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () =>
                        void call("remove_garage_member", {
                            target_membership_id: membershipId,
                        }),
                },
            ]
        );
    };

    const chooseRole = (membershipId: string) => {
        Alert.alert(
            "Member role",
            "Drivers can edit garage data. Viewers can only read it. Admins can also manage members.",
            [
                ...(["admin", "driver", "viewer"] as MemberRole[]).map(
                    (newRole) => ({
                        text: roleLabel(newRole),
                        onPress: () =>
                            void call("update_garage_member_role", {
                                target_membership_id: membershipId,
                                new_role: newRole,
                            }),
                    })
                ),
                { text: "Cancel", style: "cancel" as const },
            ]
        );
    };

    const rename = async () => {
        const nextName = garageName.trim();
        if (!resolvedGarageId) {
            Alert.alert(
                "Garage unavailable",
                "The garage is still loading. Check the connection and try again."
            );
            return;
        }
        if (!nextName || nextName === displayedGarageName) return;
        const previousName = displayedGarageName;
        setSavedGarageName(nextName);
        setGarageName(nextName);
        setBusy(true);

        try {
            const { data, error: rpcError } =
                await supabaseConnector.client.rpc("rename_garage", {
                    target_garage_id: resolvedGarageId,
                    new_name: nextName,
                });
            if (rpcError) throw rpcError;
            const returnedName = (
                data as { name?: string } | null
            )?.name?.trim();
            const confirmedName = returnedName || nextName;
            confirmedGarageNames.set(resolvedGarageId, confirmedName);
            setServerGarage((current) =>
                current ? { ...current, name: confirmedName } : current
            );
            setSavedGarageName(confirmedName);
            setGarageName(confirmedName);
            await refreshGarageSnapshot().catch(() => undefined);
            Alert.alert("Garage updated successfully");
        } catch (caught) {
            setSavedGarageName(previousName);
            setGarageName(previousName);
            Alert.alert(
                "Garage",
                requestErrorMessage(
                    caught,
                    "The garage name could not be updated."
                )
            );
        } finally {
            setBusy(false);
        }
    };

    const openFleet = async () => {
        const url = process.env.EXPO_PUBLIC_FLEET_URL;
        if (!url) {
            Alert.alert(
                "AutoCare Fleet",
                "Add EXPO_PUBLIC_FLEET_URL after the Fleet web checkout is published."
            );
            return;
        }
        await Linking.openURL(url);
    };

    if (!activeGarage && loading)
        return (
            <Screen>
                <LoadingState />
            </Screen>
        );

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
                                subtitle={`Invited as ${roleLabel(
                                    invitation.role
                                )}`}
                            />
                            <View style={styles.actions}>
                                <Button
                                    label="Decline"
                                    variant="ghost"
                                    compact
                                    onPress={() => decline(invitation.id)}
                                />
                                <Button
                                    label="Accept"
                                    compact
                                    loading={busy}
                                    onPress={() =>
                                        void accept(
                                            invitation.id,
                                            invitation.garage_id ?? ""
                                        )
                                    }
                                />
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
                        options={garages.map((garage) => ({
                            value: garage.id,
                            label: garage.name ?? "Garage",
                        }))}
                    />
                ) : null}
                <Card style={styles.planCard}>
                    <View style={styles.planIcon}>
                        <Ionicons
                            name={
                                displayedGarageKind === "fleet"
                                    ? "business-outline"
                                    : displayedGarageKind === "family"
                                    ? "people-outline"
                                    : "car-outline"
                            }
                            color={colors.primary}
                            size={24}
                        />
                    </View>
                    <View style={styles.grow}>
                        {displayedGarageName ? (
                            <Text style={styles.planName}>{displayedGarageName}</Text>
                        ) : (
                            <View style={styles.planNamePlaceholder} />
                        )}
                        <Text style={styles.planMeta}>
                            {tierLabel(displayedGarageKind)} ·{" "}
                            {roleLabel(currentRole)}
                        </Text>
                    </View>
                </Card>
                {canManageMembers ? (
                    <Card style={styles.form}>
                        <FormField
                            label="Garage name"
                            value={garageName}
                            onChangeText={setGarageName}
                            maxLength={80}
                            editable={garageSnapshotResolved}
                        />
                        <Button
                            label="Save name"
                            variant="secondary"
                            disabled={
                                !garageName.trim() ||
                                garageName.trim() === displayedGarageName
                            }
                            loading={busy}
                            onPress={rename}
                        />
                    </Card>
                ) : null}
            </View>

            {isOwned &&
            sourceGarageKind === "personal" &&
            !hasFamily &&
            !hasFleet ? (
                <Card style={styles.upgrade}>
                    <Text style={styles.upgradeTitle}>
                        Share this garage with Family
                    </Text>
                    <Text style={styles.upgradeBody}>
                        Family includes every Plus feature and supports up to
                        six people, including you.
                    </Text>
                    <Button
                        label={
                            hasFamily
                                ? "Family status is syncing"
                                : "Compare Family plans"
                        }
                        icon="people-outline"
                        onPress={() =>
                            navigation.navigate("Paywall", { source: "family" })
                        }
                    />
                </Card>
            ) : null}

            {canInvite ? (
                <View style={styles.section}>
                    <SectionHeader title="Add a garage member" />
                    <Card style={styles.form}>
                        <FormField
                            label="Email address"
                            value={email}
                            onChangeText={(value) => {
                                setEmail(value);
                                if (emailError) setEmailError(null);
                            }}
                            error={emailError ?? undefined}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoCorrect={false}
                            autoComplete="email"
                            textContentType="emailAddress"
                            required
                        />
                        <Text style={styles.label}>Role</Text>
                        <ChoiceChips
                            value={role}
                            onChange={setRole}
                            options={[
                                { value: "driver", label: "Driver" },
                                { value: "viewer", label: "Viewer" },
                                { value: "admin", label: "Admin" },
                            ]}
                        />
                        <Text style={styles.hint}>
                            Enter the email they use for AutoCare Hub. Drivers
                            can edit records, viewers can only read them, and
                            admins can also manage members.
                        </Text>
                        <Button
                            label="Create invitation"
                            icon="person-add-outline"
                            loading={busy}
                            disabled={!email.trim()}
                            onPress={invite}
                        />
                    </Card>
                </View>
            ) : null}

            <View style={styles.section}>
                <SectionHeader
                    title={`Members (${activeMemberCount}${
                        displayedSeatLimit ? `/${displayedSeatLimit}` : ""
                    })`}
                />
                <Card style={styles.list}>
                    {ownerMembershipMissing ? (
                        <>
                            <Row
                                icon="key-outline"
                                tone="green"
                                title={
                                    profile?.full_name ||
                                    profile?.email ||
                                    "You"
                                }
                                subtitle="Owner"
                            />
                            {activeMembers.length ? (
                                <View style={styles.divider} />
                            ) : null}
                        </>
                    ) : null}
                    {activeMembers.map((member, index) => (
                        <View key={member.id}>
                            <Row
                                icon={
                                    member.role === "owner"
                                        ? "key-outline"
                                        : "person-outline"
                                }
                                tone={
                                    member.role === "owner" ? "green" : "blue"
                                }
                                title={
                                    member.display_name ||
                                    member.email ||
                                    "Member"
                                }
                                subtitle={roleLabel(member.role)}
                                onPress={
                                    canManageMembers && member.role !== "owner"
                                        ? () => chooseRole(member.id)
                                        : undefined
                                }
                            />
                            {canManageMembers && member.role !== "owner" ? (
                                <View style={styles.memberActions}>
                                    <Button
                                        label="Change role"
                                        compact
                                        variant="ghost"
                                        onPress={() => chooseRole(member.id)}
                                    />
                                    <Button
                                        label="Remove"
                                        compact
                                        variant="danger"
                                        onPress={() =>
                                            remove(
                                                member.id,
                                                member.display_name ||
                                                    member.email ||
                                                    "Member"
                                            )
                                        }
                                    />
                                </View>
                            ) : null}
                            {index < activeMembers.length - 1 ? (
                                <View style={styles.divider} />
                            ) : null}
                        </View>
                    ))}
                    {!activeMemberCount ? (
                        <Text style={styles.empty}>
                            No active members are available yet.
                        </Text>
                    ) : null}
                </Card>
            </View>

            {canManageMembers && pendingMembers.length ? (
                <View style={styles.section}>
                    <SectionHeader title="Pending invitations" />
                    <Card style={styles.list}>
                        {pendingMembers.map((member) => (
                            <Row
                                key={member.id}
                                icon="time-outline"
                                tone="amber"
                                title={member.email ?? "Pending member"}
                                subtitle={`${roleLabel(
                                    member.role
                                )} · waiting for acceptance`}
                                onPress={() =>
                                    remove(
                                        member.id,
                                        member.email ?? "Pending member"
                                    )
                                }
                            />
                        ))}
                    </Card>
                </View>
            ) : null}

            {releaseFeatures.fleetBilling ? (
                <View style={styles.section}>
                    <SectionHeader title="Fleet" />
                    <Card style={styles.fleetCard}>
                        <Text style={styles.upgradeTitle}>
                            {displayedGarageKind === "fleet" || hasFleet
                                ? "Fleet workspace"
                                : "Need a business workspace?"}
                        </Text>
                        <Text style={styles.upgradeBody}>
                            {fleetAccount
                                ? `${fleetAccount.licensed_vehicles} vehicle licenses · ${fleetAccount.licensed_members} member licenses · ${fleetAccount.status}`
                                : "Fleet billing is handled on the web with vehicle and team-member licenses."}
                        </Text>
                        <Button
                            label={
                                fleetAccount
                                    ? "Manage Fleet billing"
                                    : "Learn about AutoCare Fleet"
                            }
                            icon="open-outline"
                            variant="secondary"
                            onPress={() => void openFleet()}
                        />
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
    invitation: {
        gap: spacing.md,
        borderColor: colors.warning,
        borderWidth: 1,
    },
    actions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: spacing.sm,
    },
    planCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    planIcon: {
        width: 52,
        height: 52,
        borderRadius: 18,
        backgroundColor: colors.primarySoft,
        alignItems: "center",
        justifyContent: "center",
    },
    planNamePlaceholder: { width: "58%", height: 20, borderRadius: 10, backgroundColor: colors.border },
    grow: { flex: 1, minWidth: 0 },
    planName: { ...typography.heading, color: colors.ink },
    planMeta: { ...typography.caption, color: colors.inkMuted, marginTop: 3 },
    form: { gap: spacing.md },
    upgrade: {
        gap: spacing.md,
        backgroundColor: colors.primarySoft,
        borderColor: colors.primary,
        borderWidth: 1,
    },
    fleetCard: { gap: spacing.md },
    upgradeTitle: { ...typography.heading, color: colors.ink },
    upgradeBody: { ...typography.body, color: colors.inkMuted },
    label: { ...typography.label, color: colors.ink },
    hint: { ...typography.caption, color: colors.inkMuted },
    list: { paddingVertical: spacing.sm },
    memberActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginLeft: 54,
    },
    empty: {
        ...typography.body,
        color: colors.inkMuted,
        textAlign: "center",
        padding: spacing.lg,
    },
});
