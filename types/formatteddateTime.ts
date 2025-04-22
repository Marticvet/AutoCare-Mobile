const date = new Date(); // Get current date & time
const userLocale = Intl.DateTimeFormat().resolvedOptions().locale; // Auto-detect user locale

// Format Date (User's Locale)
export const formattedDate = date.toLocaleDateString(userLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

// Format Time (User's Locale)
export const formattedTime = date.toLocaleTimeString(userLocale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
});
