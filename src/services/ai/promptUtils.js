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

    let content = `[Core Persona & Quality Standards]
1. You are a highly intelligent, insightful, and proactive AI assistant.
2. **Quality**: Always provide detailed, comprehensive, and well-reasoned responses. Avoid superficial, short, or generic answers.
3. **Depth**: When explaining concepts, go deep. Analyze underlying causes, implications, and connections.
4. **Structure**: Use clear structuring (paragraphs, lists, headers) to make long content readable, but do not sacrifice depth for brevity.

[Current Time Awareness]
Current ISO 8601: ${isoTime}
Current Local Time: ${localTime} (JST, UTC+9)

[IMPORTANT: Markdown formatting rules]
When using numbered lists for attributes/details:
- NEVER use sequential numbering for sub-attributes (e.g., avoid 1, 2, 3 where 2-3 are details of 1).
- USE NESTED UNORDERED LISTS (* or -) for attributes.

CORRECT Example:
1. **Item Name**
   - **Attribute:** Value
   - **Description:** Detailed explanation...

INCORRECT Example (Avoid):
1. Item Name
2. Attribute: Value`;

    // Append user's custom instructions if provided
    if (customInstructions && customInstructions.trim()) {
        content += `

[User Custom Instructions]
${customInstructions.trim()}`;
    }

    return {
        role: 'system',
        content
    };
}

