import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import React, { PropsWithChildren, ReactNode, useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
    useWindowDimensions,
} from "react-native";
import DateTimePicker, { DateType, useDefaultStyles } from "react-native-ui-datepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useConnectivity } from "../providers/ConnectivityProvider";
import { usePreferences } from "../i18n/PreferencesProvider";
import { colors, radius, shadow, spacing, typography } from "../theme/tokens";

type ScreenProps = PropsWithChildren<{
    scroll?: boolean;
    contentStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, scroll = true, contentStyle }: ScreenProps) {
    const content = <View style={[styles.screenContent, contentStyle]}>{children}</View>;

    return (
        <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
            <SyncBanner />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.flex}
            >
                {scroll ? (
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                        contentInsetAdjustmentBehavior="automatic"
                        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {content}
                    </ScrollView>
                ) : (
                    content
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

export function SyncBanner() {
    const { syncState } = useConnectivity();
    const { t } = usePreferences();
    const [displayState, setDisplayState] = useState<Exclude<typeof syncState, "synced"> | null>(null);

    useEffect(() => {
        if (syncState === "synced") {
            setDisplayState(null);
            return;
        }
        if (syncState === "offline" || syncState === "error") {
            setDisplayState(syncState);
            return;
        }
        const timer = setTimeout(() => setDisplayState(syncState), 750);
        return () => clearTimeout(timer);
    }, [syncState]);

    if (!displayState) return null;

    const config = {
        offline: { icon: "cloud-offline-outline", text: t("offline"), style: styles.bannerOffline },
        connecting: { icon: "cloud-outline", text: t("syncing"), style: styles.bannerSyncing },
        syncing: { icon: "sync-outline", text: t("syncing"), style: styles.bannerSyncing },
        error: { icon: "warning-outline", text: t("syncError"), style: styles.bannerError },
    }[displayState];

    return (
        <View style={[styles.banner, config.style]} accessibilityRole="alert">
            <Ionicons name={config.icon as never} color={colors.ink} size={16} />
            <Text style={styles.bannerText}>{config.text}</Text>
        </View>
    );
}

export function SectionHeader({
    title,
    action,
    onAction,
}: {
    title: string;
    action?: string;
    onAction?: () => void;
}) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {action && onAction ? (
                <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
                    <Text style={styles.sectionAction}>{action}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

export function PageHeader({
    title,
    action,
    onAction,
}: {
    title: string;
    action: string;
    onAction: () => void;
}) {
    const { width } = useWindowDimensions();
    const iconOnly = width < 430;

    return (
        <View style={styles.pageHeader}>
            <Text numberOfLines={1} style={styles.pageHeaderTitle}>{title}</Text>
            {iconOnly ? (
                <Pressable
                    onPress={onAction}
                    accessibilityRole="button"
                    accessibilityLabel={action}
                    hitSlop={8}
                    style={({ pressed }) => [styles.pageHeaderIconButton, pressed && styles.buttonPressed]}
                >
                    <Ionicons name="add" color={colors.white} size={25} />
                </Pressable>
            ) : (
                <Button label={action} icon="add" compact onPress={onAction} />
            )}
        </View>
    );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
    return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
    label,
    onPress,
    icon,
    variant = "primary",
    loading = false,
    disabled = false,
    compact = false,
}: {
    label: string;
    onPress: () => void;
    icon?: string;
    variant?: "primary" | "secondary" | "danger" | "ghost";
    loading?: boolean;
    disabled?: boolean;
    compact?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [
                styles.button,
                styles[`button_${variant}`],
                compact && styles.buttonCompact,
                (disabled || loading) && styles.buttonDisabled,
                pressed && styles.buttonPressed,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={variant === "primary" ? colors.white : colors.primary} />
            ) : (
                <>
                    {icon ? (
                        <Ionicons
                            name={icon as never}
                            color={variant === "primary" || variant === "danger" ? colors.white : colors.primary}
                            size={19}
                        />
                    ) : null}
                    <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{label}</Text>
                </>
            )}
        </Pressable>
    );
}

export function FormField({
    label,
    error,
    hint,
    required,
    multiline,
    ...inputProps
}: TextInputProps & {
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>
                {label}
                {required ? " *" : ""}
            </Text>
            <TextInput
                {...inputProps}
                multiline={multiline}
                placeholder={inputProps.placeholder ?? label}
                placeholderTextColor={colors.inkMuted}
                style={[
                    styles.input,
                    multiline && styles.inputMultiline,
                    error && styles.inputError,
                    inputProps.style,
                ]}
                accessibilityLabel={label}
            />
            {error || hint ? (
                <Text style={[styles.fieldHint, error && styles.fieldError]}>{error || hint}</Text>
            ) : null}
        </View>
    );
}

export function SelectField<T extends string>({
    label,
    value,
    onChange,
    options,
    placeholder,
    required = false,
}: {
    label: string;
    value: T | "";
    onChange: (value: T) => void;
    options: { value: T; label: string }[];
    placeholder?: string;
    required?: boolean;
}) {
    const [visible, setVisible] = useState(false);
    const { t } = usePreferences();
    const emptyLabel = placeholder ?? `${t("select")} ${label.toLocaleLowerCase()}`;
    const selectedLabel = options.find((option) => option.value === value)?.label;

    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}{required ? " *" : ""}</Text>
            <Pressable
                onPress={() => setVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({ pressed }) => [styles.input, styles.dateInput, pressed && styles.dateInputPressed]}
            >
                <Text numberOfLines={1} style={[styles.dateValue, !selectedLabel && styles.datePlaceholder]}>
                    {selectedLabel ?? emptyLabel}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.primary} />
            </Pressable>

            <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent hardwareAccelerated onRequestClose={() => setVisible(false)}>
                <View style={styles.sheetOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
                    <View style={styles.pickerSheet}>
                        <View style={styles.dateModalHeader}>
                            <Text style={styles.dateModalTitle}>{label}</Text>
                            <Pressable onPress={() => setVisible(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("close")}>
                                <Ionicons name="close" size={26} color={colors.ink} />
                            </Pressable>
                        </View>
                        <Picker
                            selectedValue={value}
                            onValueChange={(nextValue) => {
                                if (nextValue) onChange(nextValue as T);
                            }}
                            style={styles.picker}
                        >
                            <Picker.Item label={emptyLabel} value="" color={colors.inkMuted} />
                            {options.map((option) => (
                                <Picker.Item key={option.value} label={option.label} value={option.value} />
                            ))}
                        </Picker>
                        <Button label={t("done")} onPress={() => setVisible(false)} />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export function YearField({
    label,
    value,
    onChange,
    minYear = 1886,
    maxYear,
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    minYear?: number;
    maxYear?: number;
    required?: boolean;
}) {
    const currentYear = new Date().getFullYear();
    const upperYear = maxYear ?? currentYear + 2;
    const years = Array.from({ length: Math.max(upperYear - minYear + 1, 0) }, (_, index) => String(upperYear - index));
    const { t } = usePreferences();
    return (
        <SelectField
            label={label}
            value={value}
            onChange={onChange}
            options={years.map((year) => ({ value: year, label: year }))}
            placeholder={t("selectYear")}
            required={required}
        />
    );
}

export function TimeField({
    label,
    value,
    onChange,
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
}) {
    const [visible, setVisible] = useState(false);
    const { t } = usePreferences();
    const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    const fallback = new Date();
    const hour = valid ? value.slice(0, 2) : String(fallback.getHours()).padStart(2, "0");
    const minute = valid ? value.slice(3, 5) : String(fallback.getMinutes()).padStart(2, "0");
    const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
    const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

    const updateTime = (nextHour: string, nextMinute: string) => onChange(`${nextHour}:${nextMinute}`);

    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}{required ? " *" : ""}</Text>
            <Pressable
                onPress={() => setVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({ pressed }) => [styles.input, styles.dateInput, pressed && styles.dateInputPressed]}
            >
                <Text style={[styles.dateValue, !valid && styles.datePlaceholder]}>{valid ? value : "HH:mm"}</Text>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
            </Pressable>

            <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent hardwareAccelerated onRequestClose={() => setVisible(false)}>
                <View style={styles.sheetOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
                    <View style={styles.pickerSheet}>
                        <View style={styles.dateModalHeader}>
                            <Text style={styles.dateModalTitle}>{label}</Text>
                            <Pressable onPress={() => setVisible(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("close")}>
                                <Ionicons name="close" size={26} color={colors.ink} />
                            </Pressable>
                        </View>
                        <View style={styles.timePickers}>
                            <Picker selectedValue={hour} onValueChange={(nextHour) => updateTime(String(nextHour), minute)} style={styles.timePicker}>
                                {hours.map((option) => <Picker.Item key={option} label={option} value={option} />)}
                            </Picker>
                            <Text style={styles.timeSeparator}>:</Text>
                            <Picker selectedValue={minute} onValueChange={(nextMinute) => updateTime(hour, String(nextMinute))} style={styles.timePicker}>
                                {minutes.map((option) => <Picker.Item key={option} label={option} value={option} />)}
                            </Picker>
                        </View>
                        <Button label={t("done")} onPress={() => setVisible(false)} />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export function PresetOrCustomField({
    label,
    value,
    onChange,
    options,
    placeholder,
    customLabel,
    clearLabel,
    keyboardType,
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    customLabel?: string;
    clearLabel?: string;
    keyboardType?: TextInputProps["keyboardType"];
    required?: boolean;
}) {
    const { t } = usePreferences();
    const isPreset = options.some((option) => option.value === value);
    const [customSelected, setCustomSelected] = useState(Boolean(value && !isPreset));

    useEffect(() => {
        if (value && !isPreset) setCustomSelected(true);
        if (isPreset) setCustomSelected(false);
    }, [isPreset, value]);

    const customValue = "__custom__";
    const emptyValue = "__empty__";
    const selection = customSelected ? customValue : isPreset ? value : clearLabel ? emptyValue : "";
    const displayedOptions = [
        ...(clearLabel ? [{ value: emptyValue, label: clearLabel }] : []),
        ...options,
        { value: customValue, label: t("other") },
    ];
    return (
        <View style={styles.compositeField}>
            <SelectField
                label={label}
                value={selection}
                onChange={(nextValue) => {
                    if (nextValue === emptyValue) {
                        setCustomSelected(false);
                        onChange("");
                    } else if (nextValue === customValue) {
                        setCustomSelected(true);
                        if (isPreset) onChange("");
                    } else {
                        setCustomSelected(false);
                        onChange(nextValue);
                    }
                }}
                options={displayedOptions}
                placeholder={placeholder}
                required={required}
            />
            {customSelected ? (
                <FormField label={customLabel ?? t("customValue")} value={isPreset ? "" : value} onChangeText={onChange} keyboardType={keyboardType} required={required} />
            ) : null}
        </View>
    );
}

export function DateField({
    label,
    value,
    onChange,
    required = false,
    hint,
    minDate,
    maxDate,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    hint?: string;
    minDate?: string;
    maxDate?: string;
}) {
    const [visible, setVisible] = useState(false);
    const { t, language } = usePreferences();
    const defaultStyles = useDefaultStyles();
    const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T12:00:00`)
        : new Date();

    const selectDate = ({ date }: { date: DateType }) => {
        if (!date) return;
        const resolved = typeof (date as { toDate?: () => Date }).toDate === "function"
            ? (date as { toDate: () => Date }).toDate()
            : new Date(date as string | number | Date);
        if (Number.isNaN(resolved.getTime())) return;
        const formatted = `${resolved.getFullYear()}-${String(resolved.getMonth() + 1).padStart(2, "0")}-${String(resolved.getDate()).padStart(2, "0")}`;
        onChange(formatted);
        setVisible(false);
    };

    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}{required ? " *" : ""}</Text>
            <Pressable
                onPress={() => setVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({ pressed }) => [styles.input, styles.dateInput, pressed && styles.dateInputPressed]}
            >
                <Text style={[styles.dateValue, !value && styles.datePlaceholder]}>{value || "YYYY-MM-DD"}</Text>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </Pressable>
            {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}

            <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent hardwareAccelerated onRequestClose={() => setVisible(false)}>
                <View style={styles.dateModalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
                    <View style={styles.dateModalCard}>
                        <View style={styles.dateModalHeader}>
                            <Text style={styles.dateModalTitle}>{label}</Text>
                            <Pressable onPress={() => setVisible(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("close")}>
                                <Ionicons name="close" size={24} color={colors.ink} />
                            </Pressable>
                        </View>
                        <DateTimePicker
                            mode="single"
                            locale={language}
                            date={selectedDate}
                            minDate={minDate}
                            maxDate={maxDate}
                            onChange={selectDate}
                            styles={{
                                ...defaultStyles,
                                today: { borderColor: colors.primary, borderWidth: 1 },
                                selected: { backgroundColor: colors.primary },
                                selected_label: { color: colors.white },
                            }}
                        />
                        {!required && value ? (
                            <Button label={t("clearDate")} variant="ghost" compact onPress={() => { onChange(""); setVisible(false); }} />
                        ) : null}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export function ChoiceChips<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string; icon?: string }[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <View style={styles.chips}>
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <Pressable
                        key={option.value}
                        onPress={() => onChange(option.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        style={[styles.chip, selected && styles.chipSelected]}
                    >
                        {option.icon ? (
                            <Ionicons
                                name={option.icon as never}
                                size={16}
                                color={selected ? colors.white : colors.ink}
                            />
                        ) : null}
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

export function EmptyState({
    icon,
    title,
    body,
    action,
    onAction,
}: {
    icon: string;
    title: string;
    body: string;
    action?: string;
    onAction?: () => void;
}) {
    return (
        <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
                <Ionicons name={icon as never} size={30} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptyBody}>{body}</Text>
            {action && onAction ? <Button label={action} onPress={onAction} compact /> : null}
        </View>
    );
}

export function MetricCard({
    label,
    value,
    icon,
    tone = "blue",
}: {
    label: string;
    value: string;
    icon: string;
    tone?: "blue" | "green" | "amber" | "red";
}) {
    const toneStyle = {
        blue: { backgroundColor: colors.primarySoft, color: colors.primary },
        green: { backgroundColor: colors.successSoft, color: colors.success },
        amber: { backgroundColor: colors.warningSoft, color: colors.warning },
        red: { backgroundColor: colors.dangerSoft, color: colors.danger },
    }[tone];

    return (
        <Card style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: toneStyle.backgroundColor }]}>
                <Ionicons name={icon as never} size={20} color={toneStyle.color} />
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </Card>
    );
}

export function Row({
    icon,
    title,
    subtitle,
    trailing,
    onPress,
    tone = "blue",
}: {
    icon: string;
    title: string;
    subtitle?: string;
    trailing?: ReactNode;
    onPress?: () => void;
    tone?: "blue" | "green" | "amber" | "red";
}) {
    const iconColor = { blue: colors.primary, green: colors.success, amber: colors.warning, red: colors.danger }[tone];
    const backgroundColor = { blue: colors.primarySoft, green: colors.successSoft, amber: colors.warningSoft, red: colors.dangerSoft }[tone];
    return (
        <Pressable
            disabled={!onPress}
            onPress={onPress}
            accessibilityRole={onPress ? "button" : undefined}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
            <View style={[styles.rowIcon, { backgroundColor }]}>
                <Ionicons name={icon as never} size={20} color={iconColor} />
            </View>
            <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{title}</Text>
                {subtitle ? <Text numberOfLines={2} style={styles.rowSubtitle}>{subtitle}</Text> : null}
            </View>
            {trailing ?? (onPress ? <Ionicons name="chevron-forward" color={colors.inkMuted} size={20} /> : null)}
        </Pressable>
    );
}

export function LoadingState() {
    const { t } = usePreferences();
    return (
        <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t("loading")}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    safeArea: { flex: 1, position: "relative", backgroundColor: colors.canvas },
    scrollContent: { flexGrow: 1, paddingBottom: spacing.xxxl },
    screenContent: { flex: 1, padding: spacing.lg, gap: spacing.lg },
    banner: { minHeight: 34, marginTop: spacing.sm, marginHorizontal: spacing.md, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
    bannerOffline: { backgroundColor: colors.warningSoft },
    bannerSyncing: { backgroundColor: colors.primarySoft },
    bannerError: { backgroundColor: colors.dangerSoft },
    bannerText: { ...typography.caption, color: colors.ink, fontWeight: "600" },
    sectionHeader: { width: "100%", minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
    sectionTitle: { ...typography.heading, color: colors.ink, flex: 1 },
    sectionAction: { ...typography.label, color: colors.primary },
    pageHeader: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
    pageHeaderTitle: { ...typography.heading, color: colors.ink, flex: 1 },
    pageHeaderIconButton: { width: 44, height: 44, flexShrink: 0, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: spacing.lg, ...shadow },
    button: { minHeight: 52, borderRadius: radius.md, paddingHorizontal: spacing.xl, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
    buttonCompact: { minHeight: 44, alignSelf: "flex-start", flexShrink: 0, paddingHorizontal: spacing.md },
    button_primary: { backgroundColor: colors.primary },
    button_secondary: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary },
    button_danger: { backgroundColor: colors.danger },
    button_ghost: { backgroundColor: "transparent" },
    buttonDisabled: { opacity: 0.45 },
    buttonPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
    buttonText: { ...typography.bodyStrong, color: colors.white },
    buttonText_primary: { color: colors.white },
    buttonText_secondary: { color: colors.primary },
    buttonText_danger: { color: colors.white },
    buttonText_ghost: { color: colors.primary },
    field: { gap: 6 },
    fieldLabel: { ...typography.label, color: colors.ink },
    input: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: spacing.md, ...typography.body, color: colors.ink },
    inputMultiline: { minHeight: 108, paddingTop: spacing.md, textAlignVertical: "top" },
    inputError: { borderColor: colors.danger },
    fieldHint: { ...typography.caption, color: colors.inkMuted },
    fieldError: { color: colors.danger },
    dateInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
    dateInputPressed: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    dateValue: { ...typography.body, color: colors.ink },
    datePlaceholder: { color: colors.inkMuted },
    dateModalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, backgroundColor: "rgba(15, 23, 42, 0.14)" },
    dateModalCard: { width: "100%", maxWidth: 430, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface, ...shadow },
    dateModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
    dateModalTitle: { ...typography.heading, color: colors.ink, flex: 1 },
    sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.14)" },
    pickerSheet: { width: "100%", maxHeight: "62%", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md, backgroundColor: colors.surface, ...shadow },
    picker: { width: "100%", color: colors.ink },
    timePickers: { minHeight: 220, flexDirection: "row", alignItems: "center", justifyContent: "center" },
    timePicker: { flex: 1, color: colors.ink },
    timeSeparator: { ...typography.title, color: colors.ink },
    compositeField: { gap: spacing.md },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: { minHeight: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.surface },
    chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
    chipText: { ...typography.label, color: colors.ink },
    chipTextSelected: { color: colors.white },
    emptyState: { alignItems: "center", justifyContent: "center", padding: spacing.xxxl, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
    emptyIcon: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
    emptyTitle: { ...typography.heading, color: colors.ink, textAlign: "center" },
    emptyBody: { ...typography.body, color: colors.inkMuted, textAlign: "center", maxWidth: 360 },
    metricCard: { flex: 1, minWidth: 145, gap: spacing.sm },
    metricIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
    metricValue: { ...typography.heading, color: colors.ink },
    metricLabel: { ...typography.caption, color: colors.inkMuted },
    row: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
    rowPressed: { opacity: 0.7 },
    rowIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { ...typography.bodyStrong, color: colors.ink },
    rowSubtitle: { ...typography.caption, color: colors.inkMuted },
    loadingState: { flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center", gap: spacing.md },
    loadingText: { ...typography.body, color: colors.inkMuted },
});
