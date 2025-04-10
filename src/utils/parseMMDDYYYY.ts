export function parseMMDDYYYY(dateStr: string): Date {
    const [month, day, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
}