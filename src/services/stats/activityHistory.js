const pad = (value) => String(value).padStart(2, '0');

const normalizeChars = (value) => {
    const chars = Number(value);
    return Number.isFinite(chars) && chars > 0 ? chars : 0;
};

export const buildLocalDateKey = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;

export const buildLocalDateKeyFromDate = (date = new Date()) => buildLocalDateKey(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
);

export const parseLocalDateKey = (dateKey) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
    if (!match) return null;

    const [, year, month, day] = match.map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        ? date
        : null;
};

export function buildMonthActivityData(history = {}, year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = buildLocalDateKey(year, month, day);
        return {
            date,
            chars: normalizeChars(history[date]),
            dayOfWeek: new Date(year, month, day).getDay(),
            day
        };
    });
}

export function buildYearActivityData(history = {}, year) {
    const monthlyTotals = Array(12).fill(0);
    const yearPrefix = `${year}-`;

    Object.entries(history).forEach(([date, chars]) => {
        if (!date.startsWith(yearPrefix)) return;
        const monthIndex = Number(date.slice(5, 7)) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
            monthlyTotals[monthIndex] += normalizeChars(chars);
        }
    });

    return monthlyTotals.map((chars, monthIndex) => ({
        date: buildLocalDateKey(year, monthIndex, 1),
        monthIndex,
        chars,
        year
    }));
}
