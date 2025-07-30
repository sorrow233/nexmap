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

[IMPORTANT: Markdown formatting rules]
When generating numbered lists where items have attributes (keywords, description, pros/cons, etc.):
1. NEVER make attributes top-level items.
2. USE NESTED LISTS for attributes.
   - Use indentation (2 or 4 spaces) with * or - for attributes.
   - Or use soft-breaks (two spaces at end of line) to keep text in the same block.

CORRECT Example (Nested):
1. **Item Name**
   - **Attribute:** Value
   - **Description:** Text

CORRECT Example (Soft Break):
1. **Item Name**  
   **Attribute:** Value  
   **Description:** Text

INCORRECT Example (Do NOT do this):
1. Item Name
2. Attribute: Value
3. Description: Text`
    };
}

