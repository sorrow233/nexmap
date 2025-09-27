/**
 * Week Utilities
 * 
 * Shared utility functions for ISO week calculations.
 * Used by system-credits.js and redeem.js for consistent week tracking.
 */

/**
 * Get the current week number (ISO week, Monday is first day)
 * Used to reset usage count every week
 * 
 * @returns {string} Week in format "YYYY-W##" (e.g., "2026-W01")
 */
export function getCurrentWeekNumber() {
    const now = new Date();
    // Get the Thursday of the current week (ISO week algorithm)
    const thursday = new Date(now);
    thursday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + 3);
    // Get the first Thursday of the year
    const firstThursday = new Date(thursday.getFullYear(), 0, 4);
    firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
    // Calculate week number
    const weekNumber = Math.round((thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000)) + 1;
    return `${thursday.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}
