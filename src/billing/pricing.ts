import type { PurchasesPackage } from "react-native-purchases";

const packageIdentity = (item: PurchasesPackage) =>
    `${item.packageType} ${item.identifier} ${item.product.identifier}`;

export function annualSavingsPercent(packages: PurchasesPackage[]) {
    const monthly = packages.find((item) => /month/i.test(packageIdentity(item)));
    const yearly = packages.find((item) => /annual|year/i.test(packageIdentity(item)));
    if (!monthly || !yearly) return null;
    if (!monthly.product.currencyCode || monthly.product.currencyCode !== yearly.product.currencyCode) return null;
    const monthlyYear = monthly.product.price * 12;
    const annualPrice = yearly.product.price;
    if (!Number.isFinite(monthlyYear) || !Number.isFinite(annualPrice) || monthlyYear <= 0 || annualPrice <= 0 || annualPrice >= monthlyYear) return null;
    const percent = Math.round((1 - annualPrice / monthlyYear) * 100);
    return percent > 0 && percent < 100 ? percent : null;
}
