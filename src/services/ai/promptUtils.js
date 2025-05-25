/**
 * Centralized utility for generating system prompts.
 */

/**
 * Gets the current system prompt including time reference.
 * @returns {Object} System message object { role: 'system', content: string }
 */
export function getSystemPrompt() {
    const now = new Date();
    const isoTime = now.toISOString();

    // Formatting local time (Tokyo/Japan Standard Time as default based on codebase observation)
    const localTime = new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        weekday: 'long'
    }).format(now);

    return {
        role: 'system',
        content: `[Current Time Awareness]
Current ISO 8601: ${isoTime}
Current Local Time: ${localTime} (JST, UTC+9)
`
    };
}

