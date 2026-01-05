/**
 * Centralized utility for generating system prompts.
 */

/**
 * Gets the current system prompt including time reference.
 * @returns {Object} System message object { role: 'system', content: string }
 */
export function getSystemPrompt(customInstructions = '') {
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

    let content = `[Core Directive]
- MUST provide detailed, deep, and structured insights.
- ALWAYS analyze underlying causes, implications, and hidden connections.
- AVOID superficial, short, or generic responses.
- USE clear hierarchies (headers, lists) but NEVER sacrifice depth for brevity.

[Current Context]
- Time: ${localTime} (JST)
- ISO: ${isoTime}`;

    // Append user's custom instructions if provided
    if (customInstructions && customInstructions.trim()) {
        content += `\n\n[User Custom Instructions]\n${customInstructions.trim()}`;
    }

    return {
        role: 'system',
        content
    };
}

