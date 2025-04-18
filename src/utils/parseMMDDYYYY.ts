export function parseMMDDYYYY(dateStr: string): Date {
    if (dateStr.includes("/")) {
      const [month, day, year] = dateStr.split("/").map(Number);
      return new Date(year, month - 1, day);
    } else if (dateStr.includes(".")) {
      const [day, month, year] = dateStr.split(".").map(Number); // often DD.MM.YYYY
      return new Date(year, month - 1, day);
    } else if (dateStr.includes("-")) {
      // Try parsing ISO format first (YYYY-MM-DD)
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
  
      // Fallback to MM-DD-YYYY if needed
      const [month, day, year] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
  
    return new Date(NaN); // fallback
  }
  