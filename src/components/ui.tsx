import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import React, { PropsWithChildren, ReactNode, useEffect, useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useConnectivity } from "../providers/ConnectivityProvider";
import { usePreferences } from "../i18n/PreferencesProvider";
import { APP_CONTENT_MAX_WIDTH, responsiveLayoutFor } from "../theme/responsive";
import { colors, radius, shadow, spacing, typography } from "../theme/tokens";

type ScreenProps = PropsWithChildren<{
    scroll?: boolean;
    contentStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, scroll = true, contentStyle }: ScreenProps) {
    const layout = useResponsiveLayout();
    const content = (
        <View style={[styles.screenContent, { paddingHorizontal: layout.gutter }, contentStyle]}>
            {children}
        </View>
    );

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
    const layout = useResponsiveLayout();
    if (syncState !== "offline" && syncState !== "error") return null;

    const config = {
        offline: { icon: "cloud-offline-outline", text: t("offline"), style: styles.bannerOffline },
        error: { icon: "warning-outline", text: t("syncError"), style: styles.bannerError },
    }[syncState];

    return (
        <View
            pointerEvents="none"
            style={[
                styles.banner,
                { left: Math.max(spacing.md, (layout.width - APP_CONTENT_MAX_WIDTH) / 2 + spacing.md), right: Math.max(spacing.md, (layout.width - APP_CONTENT_MAX_WIDTH) / 2 + spacing.md) },
                config.style,
            ]}
            accessibilityRole="alert"
        >
            <Ionicons name={config.icon as never} color={colors.ink} size={16} />
            <Text style={styles.bannerText}>{config.text}</Text>
        </View>
    );
}

export function useResponsiveLayout() {
    const { width, height, fontScale } = useWindowDimensions();
    return useMemo(
        () => responsiveLayoutFor(width, height, fontScale),
        [fontScale, height, width]
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
    value,
    onChangeText,
    editable,
    style,
    ...inputProps
}: TextInputProps & {
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
}) {
    const { t } = usePreferences();
    const canClear = editable !== false && Boolean(onChangeText) && String(value ?? "").length > 0;
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>
                {label}
                {required ? " *" : ""}
            </Text>
            <View style={[styles.textInputShell, multiline && styles.textInputShellMultiline, error && styles.inputError]}>
                <TextInput
                    {...inputProps}
                    value={value}
                    onChangeText={onChangeText}
                    editable={editable}
                    multiline={multiline}
                    clearButtonMode="never"
                    placeholder={inputProps.placeholder ?? label}
                    placeholderTextColor={colors.inkMuted}
                    style={[styles.textInputControl, multiline && styles.textInputControlMultiline, style]}
                    accessibilityLabel={label}
                />
                {canClear ? (
                    <Pressable
                        onPress={() => onChangeText?.("")}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={t("clearField", { label })}
                        style={styles.clearInputButton}
                    >
                        <Ionicons name="close-circle" size={21} color={colors.borderStrong} />
                    </Pressable>
                ) : null}
            </View>
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
                <Text numberOfLines={2} style={[styles.dateValue, !selectedLabel && styles.datePlaceholder]}>
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
                        <ScrollView
                            style={styles.selectOptions}
                            contentContainerStyle={styles.selectOptionsContent}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            showsVerticalScrollIndicator={options.length > 6}
                        >
                            {options.length === 0 ? (
                                <View style={styles.selectOptionsEmpty}>
                                    <Text style={styles.datePlaceholder}>{emptyLabel}</Text>
                                </View>
                            ) : options.map((option) => {
                                const selected = option.value === value;
                                return (
                                    <Pressable
                                        key={option.value}
                                        accessibilityRole="radio"
                                        accessibilityState={{ checked: selected }}
                                        onPress={() => onChange(option.value)}
                                        style={({ pressed }) => [
                                            styles.selectOption,
                                            selected && styles.selectOptionSelected,
                                            pressed && styles.selectOptionPressed,
                                        ]}
                                    >
                                        <Text style={[styles.selectOptionText, selected && styles.selectOptionTextSelected]}>
                                            {option.label}
                                        </Text>
                                        {selected ? <Ionicons name="checkmark-circle" size={21} color={colors.primary} /> : null}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
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
                <Text style={[styles.dateValue, !valid && styles.datePlaceholder]}>{valid ? value : t("timePlaceholder")}</Text>
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
    const yearsPerPage = 20;
    const [visible, setVisible] = useState(false);
    const [visibleMonth, setVisibleMonth] = useState(() => calendarMonth(value));
    const [calendarView, setCalendarView] = useState<"days" | "years" | "months">("days");
    const [yearPageStart, setYearPageStart] = useState(() => Math.floor(calendarMonth(value).year / yearsPerPage) * yearsPerPage);
    const { t, locale } = usePreferences();
    const monthName = useMemo(
        () => new Intl.DateTimeFormat(locale, { month: "long" })
            .format(new Date(visibleMonth.year, visibleMonth.month, 1, 12)),
        [locale, visibleMonth]
    );
    const monthOptions = useMemo(() => {
        const formatter = new Intl.DateTimeFormat(locale, { month: "short" });
        return Array.from({ length: 12 }, (_, month) => ({
            month,
            label: formatter.format(new Date(2020, month, 1, 12)),
        }));
    }, [locale]);
    const currentYear = new Date().getFullYear();
    const constrainedMinYear = Number(minDate?.slice(0, 4));
    const constrainedMaxYear = Number(maxDate?.slice(0, 4));
    const minCalendarYear = constrainedMinYear || Math.min(1900, visibleMonth.year);
    const maxCalendarYear = constrainedMaxYear || Math.max(currentYear + 50, visibleMonth.year);
    const yearOptions = useMemo(
        () => Array.from({ length: yearsPerPage }, (_, index) => yearPageStart + index),
        [yearPageStart]
    );
    const weekdayLabels = useMemo(() => {
        const formatter = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
        // 2 August 2021 was a Monday. Keep Monday as the first column.
        return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2021, 7, 2 + index, 12)));
    }, [locale]);
    const monthCells = useMemo(() => {
        const firstWeekday = (new Date(visibleMonth.year, visibleMonth.month, 1, 12).getDay() + 6) % 7;
        const dayCount = new Date(visibleMonth.year, visibleMonth.month + 1, 0, 12).getDate();
        const cells: Array<number | null> = [
            ...Array.from({ length: firstWeekday }, () => null),
            ...Array.from({ length: dayCount }, (_, index) => index + 1),
        ];
        while (cells.length % 7) cells.push(null);
        return cells;
    }, [visibleMonth]);
    const today = localCalendarDate(new Date());

    const openCalendar = () => {
        const initialMonth = calendarMonth(value);
        setVisibleMonth(initialMonth);
        setYearPageStart(Math.floor(initialMonth.year / yearsPerPage) * yearsPerPage);
        setCalendarView("days");
        setVisible(true);
    };

    const moveCalendar = (months: number) => {
        setVisibleMonth((current) => {
            const absoluteMonth = current.year * 12 + current.month + months;
            return {
                year: Math.floor(absoluteMonth / 12),
                month: ((absoluteMonth % 12) + 12) % 12,
            };
        });
    };

    const selectDay = (day: number) => {
        const selected = `${visibleMonth.year}-${String(visibleMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if ((minDate && selected < minDate) || (maxDate && selected > maxDate)) return;
        onChange(selected);
        setVisible(false);
    };

    const selectYear = (year: number) => {
        if (year < minCalendarYear || year > maxCalendarYear) return;
        setVisibleMonth((current) => ({ ...current, year }));
        setCalendarView("months");
    };

    const monthIsDisabled = (month: number) => {
        const monthNumber = String(month + 1).padStart(2, "0");
        const monthStart = `${visibleMonth.year}-${monthNumber}-01`;
        const lastDay = new Date(visibleMonth.year, month + 1, 0, 12).getDate();
        const monthEnd = `${visibleMonth.year}-${monthNumber}-${String(lastDay).padStart(2, "0")}`;
        return Boolean((minDate && monthEnd < minDate) || (maxDate && monthStart > maxDate));
    };

    const selectMonth = (month: number) => {
        if (monthIsDisabled(month)) return;
        setVisibleMonth((current) => ({ ...current, month }));
        setCalendarView("days");
    };

    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}{required ? " *" : ""}</Text>
            <Pressable
                onPress={openCalendar}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({ pressed }) => [styles.input, styles.dateInput, pressed && styles.dateInputPressed]}
            >
                <Text style={[styles.dateValue, !value && styles.datePlaceholder]}>{value || t("datePlaceholder")}</Text>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </Pressable>
            {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}

            <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent hardwareAccelerated onRequestClose={() => setVisible(false)}>
                <View style={styles.dateModalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
                    <View style={styles.dateModalCard}>
                        <ScrollView
                            contentContainerStyle={styles.dateModalContent}
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                        >
                        <View style={styles.dateModalHeader}>
                            <Text style={styles.dateModalTitle}>
                                {calendarView === "years" ? t("chooseYear") : calendarView === "months" ? t("chooseMonth") : label}
                            </Text>
                            <Pressable onPress={() => setVisible(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("close")}>
                                <Ionicons name="close" size={24} color={colors.ink} />
                            </Pressable>
                        </View>
                        {calendarView === "days" ? (
                            <>
                                <View style={styles.calendarNavigation}>
                                    <Pressable onPress={() => moveCalendar(-1)} accessibilityRole="button" accessibilityLabel={t("previousMonth")} hitSlop={6} style={styles.calendarNavigationButton}>
                                        <Ionicons name="chevron-back" size={22} color={colors.primary} />
                                    </Pressable>
                                    <View style={styles.calendarCurrentPeriod}>
                                        <Pressable onPress={() => setCalendarView("months")} accessibilityRole="button" accessibilityLabel={t("chooseMonth")} style={styles.calendarPeriodButton}>
                                            <Text style={styles.calendarMonthLabel}>{monthName}</Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => {
                                                setYearPageStart(Math.floor(visibleMonth.year / yearsPerPage) * yearsPerPage);
                                                setCalendarView("years");
                                            }}
                                            accessibilityRole="button"
                                            accessibilityLabel={t("chooseYear")}
                                            style={styles.calendarPeriodButton}
                                        >
                                            <Text style={styles.calendarYearLabel}>{visibleMonth.year}</Text>
                                            <Ionicons name="chevron-down" size={15} color={colors.primary} />
                                        </Pressable>
                                    </View>
                                    <Pressable onPress={() => moveCalendar(1)} accessibilityRole="button" accessibilityLabel={t("nextMonth")} hitSlop={6} style={styles.calendarNavigationButton}>
                                        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
                                    </Pressable>
                                </View>
                                <View style={styles.calendarWeekdays}>
                                    {weekdayLabels.map((weekday, index) => (
                                        <Text key={`${weekday}-${index}`} style={styles.calendarWeekday}>{weekday}</Text>
                                    ))}
                                </View>
                                <View style={styles.calendarGrid}>
                                    {monthCells.map((day, index) => {
                                        if (!day) return <View key={`empty-${index}`} style={styles.calendarDaySlot} />;
                                        const calendarValue = `${visibleMonth.year}-${String(visibleMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                        const selected = calendarValue === value;
                                        const isToday = calendarValue === today;
                                        const disabled = Boolean((minDate && calendarValue < minDate) || (maxDate && calendarValue > maxDate));
                                        return (
                                            <View key={calendarValue} style={styles.calendarDaySlot}>
                                                <Pressable
                                                    onPress={() => selectDay(day)}
                                                    disabled={disabled}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={calendarValue}
                                                    accessibilityState={{ selected, disabled }}
                                                    style={({ pressed }) => [
                                                        styles.calendarDay,
                                                        isToday && styles.calendarToday,
                                                        selected && styles.calendarSelected,
                                                        disabled && styles.calendarDisabled,
                                                        pressed && !disabled && styles.buttonPressed,
                                                    ]}
                                                >
                                                    <Text style={[styles.calendarDayText, selected && styles.calendarSelectedText]}>{day}</Text>
                                                </Pressable>
                                            </View>
                                        );
                                    })}
                                </View>
                            </>
                        ) : calendarView === "years" ? (
                            <>
                                <View style={styles.calendarPickerNavigation}>
                                    <Pressable
                                        onPress={() => setYearPageStart((current) => current - yearsPerPage)}
                                        disabled={yearPageStart <= minCalendarYear}
                                        accessibilityRole="button"
                                        accessibilityLabel={t("earlierYears")}
                                        style={[styles.calendarNavigationButton, yearPageStart <= minCalendarYear && styles.calendarDisabled]}
                                    >
                                        <Ionicons name="chevron-back" size={22} color={colors.primary} />
                                    </Pressable>
                                    <Text style={styles.calendarRangeLabel}>{yearPageStart}–{yearPageStart + yearsPerPage - 1}</Text>
                                    <Pressable
                                        onPress={() => setYearPageStart((current) => current + yearsPerPage)}
                                        disabled={yearPageStart + yearsPerPage - 1 >= maxCalendarYear}
                                        accessibilityRole="button"
                                        accessibilityLabel={t("laterYears")}
                                        style={[styles.calendarNavigationButton, yearPageStart + yearsPerPage - 1 >= maxCalendarYear && styles.calendarDisabled]}
                                    >
                                        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
                                    </Pressable>
                                </View>
                                <View style={styles.calendarYearGrid}>
                                    {yearOptions.map((year) => {
                                        const selected = year === visibleMonth.year;
                                        const disabled = year < minCalendarYear || year > maxCalendarYear;
                                        return (
                                            <Pressable
                                                key={year}
                                                onPress={() => selectYear(year)}
                                                disabled={disabled}
                                                accessibilityRole="button"
                                                accessibilityLabel={String(year)}
                                                accessibilityState={{ selected, disabled }}
                                                style={({ pressed }) => [
                                                    styles.calendarPickerOption,
                                                    selected && styles.calendarSelected,
                                                    disabled && styles.calendarDisabled,
                                                    pressed && !disabled && styles.buttonPressed,
                                                ]}
                                            >
                                                <Text style={[styles.calendarPickerOptionText, selected && styles.calendarSelectedText]}>{year}</Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </>
                        ) : (
                            <>
                                <Pressable
                                    onPress={() => {
                                        setYearPageStart(Math.floor(visibleMonth.year / yearsPerPage) * yearsPerPage);
                                        setCalendarView("years");
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={t("chooseDifferentYear")}
                                    style={styles.calendarSelectedYear}
                                >
                                    <Text style={styles.calendarYearLabel}>{visibleMonth.year}</Text>
                                    <Ionicons name="chevron-down" size={16} color={colors.primary} />
                                </Pressable>
                                <View style={styles.calendarMonthGrid}>
                                    {monthOptions.map((option) => {
                                        const selected = option.month === visibleMonth.month;
                                        const disabled = monthIsDisabled(option.month);
                                        return (
                                            <Pressable
                                                key={option.month}
                                                onPress={() => selectMonth(option.month)}
                                                disabled={disabled}
                                                accessibilityRole="button"
                                                accessibilityLabel={`${option.label} ${visibleMonth.year}`}
                                                accessibilityState={{ selected, disabled }}
                                                style={({ pressed }) => [
                                                    styles.calendarMonthOption,
                                                    selected && styles.calendarSelected,
                                                    disabled && styles.calendarDisabled,
                                                    pressed && !disabled && styles.buttonPressed,
                                                ]}
                                            >
                                                <Text style={[styles.calendarPickerOptionText, selected && styles.calendarSelectedText]}>{option.label}</Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </>
                        )}
                        {!required && value ? (
                            <Button label={t("clearDate")} variant="ghost" compact onPress={() => { onChange(""); setVisible(false); }} />
                        ) : null}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function calendarMonth(value: string) {
    const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(value);
    if (match) return { year: Number(match[1]), month: Number(match[2]) - 1 };
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
}

function localCalendarDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function ChoiceChips<T extends string>({
    options,
    value,
    onChange,
    disabled = false,
}: {
    options: { value: T; label: string; icon?: string }[];
    value: T;
    onChange: (value: T) => void;
    disabled?: boolean;
}) {
    return (
        <View style={styles.chips}>
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <Pressable
                        key={option.value}
                        onPress={() => onChange(option.value)}
                        disabled={disabled}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected, disabled }}
                        style={[styles.chip, selected && styles.chipSelected, disabled && styles.buttonDisabled]}
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
    scrollContent: { flexGrow: 1, width: "100%", paddingBottom: spacing.xxxl },
    screenContent: { flex: 1, width: "100%", maxWidth: APP_CONTENT_MAX_WIDTH, alignSelf: "center", paddingVertical: spacing.lg, gap: spacing.lg },
    banner: { position: "absolute", zIndex: 100, top: spacing.sm, left: spacing.md, right: spacing.md, minHeight: 34, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, ...shadow },
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
    button: { minHeight: 52, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
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
    textInputShell: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingLeft: spacing.md, paddingRight: spacing.sm, flexDirection: "row", alignItems: "center" },
    textInputShellMultiline: { minHeight: 108, alignItems: "flex-start" },
    textInputControl: { minHeight: 48, flex: 1, paddingVertical: 0, paddingRight: spacing.xs, ...typography.body, color: colors.ink },
    textInputControlMultiline: { minHeight: 106, paddingTop: spacing.md, paddingBottom: spacing.md, textAlignVertical: "top" },
    clearInputButton: { width: 32, height: 48, alignItems: "center", justifyContent: "center" },
    inputError: { borderColor: colors.danger },
    fieldHint: { ...typography.caption, color: colors.inkMuted },
    fieldError: { color: colors.danger },
    dateInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
    dateInputPressed: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    dateValue: { ...typography.body, color: colors.ink },
    datePlaceholder: { color: colors.inkMuted },
    dateModalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, backgroundColor: "rgba(15, 23, 42, 0.14)" },
    dateModalCard: { width: "100%", maxWidth: 430, maxHeight: "94%", borderRadius: radius.xl, backgroundColor: colors.surface, overflow: "hidden", ...shadow },
    dateModalContent: { padding: spacing.lg, gap: spacing.md },
    dateModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
    dateModalTitle: { ...typography.heading, color: colors.ink, flex: 1 },
    calendarNavigation: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    calendarNavigationButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: radius.pill },
    calendarCurrentPeriod: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
    calendarPeriodButton: { minHeight: 40, paddingHorizontal: spacing.xs, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, borderRadius: radius.md },
    calendarMonthLabel: { ...typography.bodyStrong, color: colors.ink, textAlign: "center", textTransform: "capitalize" },
    calendarYearLabel: { ...typography.bodyStrong, color: colors.primary },
    calendarPickerNavigation: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    calendarRangeLabel: { ...typography.bodyStrong, color: colors.ink, textAlign: "center" },
    calendarYearGrid: { flexDirection: "row", flexWrap: "wrap" },
    calendarPickerOption: { width: "25%", minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
    calendarPickerOptionText: { ...typography.body, color: colors.ink, textTransform: "capitalize" },
    calendarSelectedYear: { minHeight: 44, alignSelf: "center", paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radius.md, backgroundColor: colors.primarySoft },
    calendarMonthGrid: { flexDirection: "row", flexWrap: "wrap" },
    calendarMonthOption: { width: `${100 / 3}%`, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
    calendarWeekdays: { flexDirection: "row" },
    calendarWeekday: { width: `${100 / 7}%`, ...typography.caption, color: colors.inkMuted, fontWeight: "700", textAlign: "center" },
    calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
    calendarDaySlot: { width: `${100 / 7}%`, height: 44, alignItems: "center", justifyContent: "center" },
    calendarDay: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    calendarToday: { borderWidth: 1, borderColor: colors.primary },
    calendarSelected: { backgroundColor: colors.primary },
    calendarDisabled: { opacity: 0.28 },
    calendarDayText: { ...typography.body, color: colors.ink },
    calendarSelectedText: { color: colors.white, fontWeight: "700" },
    sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.14)" },
    pickerSheet: { width: "100%", maxWidth: 620, maxHeight: "90%", alignSelf: "center", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md, backgroundColor: colors.surface, ...shadow },
    picker: { width: "100%", color: colors.ink },
    selectOptions: { flexGrow: 0, maxHeight: 380, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
    selectOptionsContent: { padding: spacing.xs },
    selectOption: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
    selectOptionSelected: { backgroundColor: colors.primarySoft },
    selectOptionPressed: { opacity: 0.72 },
    selectOptionText: { ...typography.body, color: colors.ink, flex: 1 },
    selectOptionTextSelected: { color: colors.primary, fontWeight: "700" },
    selectOptionsEmpty: { minHeight: 64, alignItems: "center", justifyContent: "center", padding: spacing.md },
    timePickers: { minHeight: 220, flexDirection: "row", alignItems: "center", justifyContent: "center" },
    timePicker: { flex: 1, color: colors.ink },
    timeSeparator: { ...typography.title, color: colors.ink },
    compositeField: { gap: spacing.md },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: { minHeight: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.surface },
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
    rowText: { flex: 1, minWidth: 0, gap: 2 },
    rowTitle: { ...typography.bodyStrong, color: colors.ink },
    rowSubtitle: { ...typography.caption, color: colors.inkMuted },
    loadingState: { flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center", gap: spacing.md },
    loadingText: { ...typography.body, color: colors.inkMuted },
});
