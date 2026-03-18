const DEFAULT_TIME_ZONE = 'Asia/Tokyo';
const DEFAULT_LOCALE = 'zh-CN';

function getResolvedTimeZone(fallbackTimeZone = DEFAULT_TIME_ZONE) {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || fallbackTimeZone;
    } catch (error) {
        return fallbackTimeZone;
    }
}

function mapDaypart(hour24) {
    if (hour24 < 6) return '凌晨';
    if (hour24 < 12) return '早上';
    if (hour24 < 18) return '下午';
    return '晚上';
}

function getFormatterParts(date, locale, timeZone) {
    return new Intl.DateTimeFormat(locale, {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(date).reduce((acc, part) => {
        if (part.type !== 'literal') {
            acc[part.type] = part.value;
        }
        return acc;
    }, {});
}

function getOffsetLabel(date, timeZone) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            timeZoneName: 'longOffset',
            hour: '2-digit'
        }).formatToParts(date);

        const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value;
        return timeZoneName || timeZone;
    } catch (error) {
        return timeZone;
    }
}

export function getLocalTimeContext(date = new Date(), options = {}) {
    const locale = options.locale || DEFAULT_LOCALE;
    const timeZone = options.timeZone || getResolvedTimeZone(options.fallbackTimeZone);
    const parts = getFormatterParts(date, locale, timeZone);
    const hour24 = Number(parts.hour || '0');

    return {
        timeZone,
        locale,
        localDate: `${parts.year}-${parts.month}-${parts.day}`,
        localTime: `${parts.hour}:${parts.minute}:${parts.second}`,
        weekday: parts.weekday,
        hour24,
        minute: Number(parts.minute || '0'),
        second: Number(parts.second || '0'),
        daypart: mapDaypart(hour24),
        offsetLabel: getOffsetLabel(date, timeZone)
    };
}

export function buildTimeAwarenessPrompt(date = new Date(), options = {}) {
    const context = getLocalTimeContext(date, options);

    return `[Current Local Time Context]
Use ONLY the local time below when deciding whether it is 凌晨 / 早上 / 下午 / 晚上.
Do NOT infer local time from UTC, ISO timestamps, server timezone, or any other hidden metadata.
If you mention the current time in your reply, it must stay consistent with this local context.

Timezone: ${context.timeZone}
UTC Offset: ${context.offsetLabel}
Local Date: ${context.localDate}
Local Time (24h): ${context.localTime}
Weekday: ${context.weekday}
Daypart: ${context.daypart}`;
}

export { DEFAULT_LOCALE, DEFAULT_TIME_ZONE };
