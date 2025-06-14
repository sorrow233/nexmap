/**
 * Centralized utility for generating system prompts with time awareness and core rules.
 */

/**
 * Gets the current system prompt including time reference and search instructions.
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

[Operational Rules]
1. Time Sensitivity: Treat the provided time as the absolute source of truth for "today", "now", or any relative time queries.
2. Search Mandate (CRITICAL):
   - You MUST use Google Search for ANY query involving: current events, news, today's dates, recent product releases, weather, stock prices, or any information that changes daily.
   - If a user asks about "today" or "recent" events, DO NOT rely on your internal knowledge. Search first.
   - Even if you think you know the answer, if it pertains to "now" (late 2025 context), verify via search to ensure accuracy.
3. Grounding: When using search results, cite your findings clearly with dates. If search results contradict your internal knowledge, prioritize the search results.
4. Response Tone: Be helpful, concise, and accurate. If search yields no result, state that clearly but also mention the current date you checked.
`
    };
}

/**
 * Gets a short reinforcement note to be appended to the last user message.
 * This helps models remember the search mandate and current time in long contexts.
 */
export function getSearchReinforcement() {
    const now = new Date();
    const localStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Tokyo' });
    return `\n\n[System Reminder: Current Time is ${localStr} JST. Use Google Search for any today's news or recent 2025 updates.]`;
}
