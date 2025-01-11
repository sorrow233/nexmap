
/**
 * Separates the "thinking process" (internal monologue) from the final response.
 * Heuristic: The Gemini 3 Flash model (preview) often outputs thoughts in blocks starting with **Header**.
 * We treat initial paragraphs starting with ** as thoughts, until we hit a paragraph that doesn't (or is the likely final answer).
 * 
 * @param {string} content 
 * @returns {{ thoughts: string|null, content: string }}
 */
export function parseModelOutput(content) {
    if (!content) return { thoughts: null, content: '' };

    // If content is very short, just return it (avoid hiding "Hello")
    if (content.length < 10) return { thoughts: null, content };

    const parts = content.split(/\n\n+/);
    let splitIndex = 0;

    // Scan identifying thought blocks at the start
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        // Check if part starts with markdown bold "**"
        // Most responses don't start with bold unless it's a title, but thoughts ALWAYS do in this model.
        // We also check if it contains English typical thought keywords like "Analyzing", "Thinking", etc? 
        // No, keep it simple: strict structure check.
        if (part.startsWith('**')) {
            splitIndex = i + 1;
        } else {
            // Found a non-bold starting block, assume response started
            break;
        }
    }

    // Safety: If ALL parts are identified as thoughts (e.g. a list of bold items), 
    // we probably shouldn't hide everything.
    // If splitIndex == parts.length, it means the entire response looks like thoughts.
    // In that case, we might show everything to be safe.
    // UNLESS the last block is clearly the answer? 
    // Let's rely on the user behavior: they usually ask questions where answer is plain text.
    // But if the answer is "**Sure!** Here is...", we'd hide it.
    // Safety heuristic: If splitIndex covers > 80% of text characters, and text length is small?
    // Let's just be aggressive as requested by user -> "Clean response".
    // But if ALL is thoughts, we fall back to: "Display last part as content"?

    if (splitIndex === parts.length && parts.length > 0) {
        // All parts matched thought pattern. Retain the LAST part as content.
        // Or if there's only 1 part and it starts with **, treat as content?
        if (parts.length === 1) {
            return { thoughts: null, content };
        }
        splitIndex = parts.length - 1;
    }

    if (splitIndex > 0) {
        const thoughts = parts.slice(0, splitIndex).join('\n\n');
        const finalContent = parts.slice(splitIndex).join('\n\n');
        return { thoughts, content: finalContent };
    }

    return { thoughts: null, content };
}
