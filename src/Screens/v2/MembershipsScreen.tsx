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
import { usePreferences } from "../../i18n/PreferencesProvider";

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
    const { t } = usePreferences();
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
    const roleLabel = useCallback((memberRole?: string | null) => {
        if (memberRole === "owner") return t("owner");
        if (memberRole === "admin") return t("admin");
        if (memberRole === "driver") return t("driver");
        if (memberRole === "viewer") return t("viewer");
        return t("member");
    }, [t]);
    const tierLabel = useCallback((kind?: string | null) => {
        if (kind === "family") return t("family");
        if (kind === "fleet") return t("fleet");
        return t("personal");
    }, [t]);

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
            if (success) Alert.alert(t("garage"), success);
            return true;
        } catch (caught) {
            Alert.alert(
                t("garage"),
                requestErrorMessage(
                    caught,
                    t("requestIncomplete")
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
                t("garageUnavailable"),
                t("garageStillLoading")
            );
            return;
        }
        if (!isValidEmail(normalizedEmail)) {
            setEmailError(t("invalidEmail"));
            return;
        }
        if (normalizedEmail === profile?.email?.trim().toLowerCase()) {
            setEmailError(t("alreadyGarageOwner"));
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
            t("invitationCreated")
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
                t("invitationAccepted")
            )
        ) {
            await selectGarage(garageId);
        }
    };

    const decline = (membershipId: string) => {
        Alert.alert(
            t("declineInvitationQuestion"),
            t("declineInvitationBody"),
            [
                { text: t("cancel"), style: "cancel" },
                {
                    text: t("decline"),
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
            t("removeMemberQuestion"),
            t("removeMemberBody", { name: label }),
            [
                { text: t("cancel"), style: "cancel" },
                {
                    text: t("remove"),
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
            t("memberRole"),
            t("memberRoleBody"),
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
                { text: t("cancel"), style: "cancel" as const },
            ]
        );
    };

    const rename = async () => {
        const nextName = garageName.trim();
        if (!resolvedGarageId) {
            Alert.alert(
                t("garageUnavailable"),
                t("garageStillLoading")
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
            Alert.alert(t("garageUpdated"));
        } catch (caught) {
            setSavedGarageName(previousName);
            setGarageName(previousName);
            Alert.alert(
                t("garage"),
                requestErrorMessage(
                    caught,
                    t("garageNameUpdateError")
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
                t("fleetUrlMissing")
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
                    <SectionHeader title={t("garageInvitations")} />
                    {invitationCards.map(({ invitation, garage }) => (
                        <Card key={invitation.id} style={styles.invitation}>
                            <Row
                                icon="mail-unread-outline"
                                tone="amber"
                                title={garage?.name ?? t("sharedGarage")}
                                subtitle={t("invitedAs", { role: roleLabel(invitation.role) })}
                            />
                            <View style={styles.actions}>
                                <Button
                                    label={t("decline")}
                                    variant="ghost"
                                    compact
                                    onPress={() => decline(invitation.id)}
                                />
                                <Button
                                    label={t("accept")}
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
                <SectionHeader title={t("activeGarage")} />
                {garages.length > 1 ? (
                    <SelectField
                        label={t("garage")}
                        value={activeGarageId}
                        onChange={(value) => void selectGarage(value)}
                        options={garages.map((garage) => ({
                            value: garage.id,
                            label: garage.name ?? t("garage"),
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
                            label={t("garageName")}
                            value={garageName}
                            onChangeText={setGarageName}
                            maxLength={80}
                            editable={garageSnapshotResolved}
                        />
                        <Button
                            label={t("saveName")}
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
                        {t("shareGarageFamily")}
                    </Text>
                    <Text style={styles.upgradeBody}>
                        {t("familyPlanBody")}
                    </Text>
                    <Button
                        label={
                            hasFamily
                                ? t("familyStatusSyncing")
                                : t("compareFamilyPlans")
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
                    <SectionHeader title={t("addGarageMember")} />
                    <Card style={styles.form}>
                        <FormField
                            label={t("emailAddress")}
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
                        <Text style={styles.label}>{t("role")}</Text>
                        <ChoiceChips
                            value={role}
                            onChange={setRole}
                            options={[
                                { value: "driver", label: t("driver") },
                                { value: "viewer", label: t("viewer") },
                                { value: "admin", label: t("admin") },
                            ]}
                        />
                        <Text style={styles.hint}>
                            {t("inviteRoleHint")}
                        </Text>
                        <Button
                            label={t("createInvitation")}
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
                    title={t("membersCount", { count: `${activeMemberCount}${displayedSeatLimit ? `/${displayedSeatLimit}` : ""}` })}
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
                                    t("you")
                                }
                                subtitle={t("owner")}
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
                                    t("member")
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
                                        label={t("changeRole")}
                                        compact
                                        variant="ghost"
                                        onPress={() => chooseRole(member.id)}
                                    />
                                    <Button
                                        label={t("remove")}
                                        compact
                                        variant="danger"
                                        onPress={() =>
                                            remove(
                                                member.id,
                                                member.display_name ||
                                                    member.email ||
                                                    t("member")
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
                            {t("noActiveMembers")}
                        </Text>
                    ) : null}
                </Card>
            </View>

            {canManageMembers && pendingMembers.length ? (
                <View style={styles.section}>
                    <SectionHeader title={t("pendingInvitations")} />
                    <Card style={styles.list}>
                        {pendingMembers.map((member) => (
                            <Row
                                key={member.id}
                                icon="time-outline"
                                tone="amber"
                                title={member.email ?? t("pendingMember")}
                                subtitle={t("waitingForAcceptance", { role: roleLabel(member.role) })}
                                onPress={() =>
                                    remove(
                                        member.id,
                                        member.email ?? t("pendingMember")
                                    )
                                }
                            />
                        ))}
                    </Card>
                </View>
            ) : null}

            {releaseFeatures.fleetBilling ? (
                <View style={styles.section}>
                    <SectionHeader title={t("fleet")} />
                    <Card style={styles.fleetCard}>
                        <Text style={styles.upgradeTitle}>
                            {displayedGarageKind === "fleet" || hasFleet
                                ? t("fleetWorkspace")
                                : t("needBusinessWorkspace")}
                        </Text>
                        <Text style={styles.upgradeBody}>
                            {fleetAccount
                                ? t("fleetLicenses", { vehicles: fleetAccount.licensed_vehicles ?? 0, members: fleetAccount.licensed_members ?? 0, status: fleetAccount.status ?? "" })
                                : t("fleetBillingBody")}
                        </Text>
                        <Button
                            label={
                                fleetAccount
                                    ? t("manageFleetBilling")
                                    : t("learnAboutFleet")
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
