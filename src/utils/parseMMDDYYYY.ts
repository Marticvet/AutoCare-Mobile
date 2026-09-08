export function parseMMDDYYYY(dateStr: string): Date {
    if (dateStr.includes("/")) {
      const [month, day, year] = dateStr.split("/").map(Number);
      return new Date(year, month - 1, day);
    } else if (dateStr.includes(".")) {
      const [day, month, year] = dateStr.split(".").map(Number); // often DD.MM.YYYY
      return new Date(year, month - 1, day);
    } else if (dateStr.includes("-")) {
      // Parse ISO calendar dates as local dates. `new Date("YYYY-MM-DD")`
      // treats the value as UTC and displays the previous day west of UTC.
      const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
      if (isoMatch) {
        return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
      }

      // Fallback to MM-DD-YYYY if needed
      const [month, day, year] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    return new Date(NaN); // fallback
  }
