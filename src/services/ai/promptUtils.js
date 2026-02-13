/**
 * Centralized utility for generating system prompts.
 */

const normalizeInstructionsForPrompt = (customInstructions) => {
    if (!customInstructions) return [];

    if (Array.isArray(customInstructions)) {
        return customInstructions
            .map(item => {
                if (typeof item === 'string') {
                    const content = item.trim();
                    return content ? { title: '', content } : null;
                }
                if (!item || typeof item !== 'object') return null;
                const content = String(item.content || item.text || '').trim();
                if (!content) return null;
                return {
                    title: String(item.title || item.name || item.text || '').trim(),
                    content
                };
            })
            .filter(Boolean);
    }

    if (typeof customInstructions === 'string') {
        const text = customInstructions.trim();
        return text ? [{ title: '', content: text }] : [];
    }

    return [];
};

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

    let content = `[Current Time Awareness]
Current ISO 8601: ${isoTime}
Current Local Time: ${localTime} (JST, UTC+9)

[Search Policy - Aggressive]
If web search tool is available, prefer searching before answering most knowledge-seeking prompts.
Default behavior:
- Perform at least one web search for factual questions, recent events, statistics, product/service comparisons, pricing, policy/legal/medical/financial info, company/org/person updates, and recommendations.
- If uncertain about any key fact, search first instead of guessing.
- Only skip search when the request is purely creative, personal opinion, or fully answerable from user-provided context.

[IMPORTANT: Markdown formatting rules]
When generating numbered lists where items have attributes (keywords, description, pros/cons, etc.):
1. NEVER use sequential numbering for attributes (e.g., don't go 1, 2, 3, 4 where 2-4 are details of 1).
2. USE NESTED LISTS for attributes.
   - Use indentation (exactly 2 or 4 spaces) with * or - for attributes.
   - Each attribute MUST be on a new line and indented.
   - DO NOT use numbers for nested attribute lists.

CORRECT Example (Nested):
1. **Item Name**
   - **Attribute:** Value
   - **Description:** Text

INCORRECT Example (Do NOT do this):
1. Item Name
2. Attribute: Value
3. Description: Text

INCORRECT Example (Do NOT do this):
1. Item Name
1.1 Attribute: Value
1.2 Description: Text`;

    const instructionList = normalizeInstructionsForPrompt(customInstructions);

    // Append user's custom instructions if provided
    if (instructionList.length > 0) {
        const formattedInstructions = instructionList
            .map((item, idx) => item.title ? `${idx + 1}. [${item.title}] ${item.content}` : `${idx + 1}. ${item.content}`)
            .join('\n');

        content += `

[User Custom Instructions]
${formattedInstructions}`;
    }

    return {
        role: 'system',
        content
    };
}
