
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

    // Heuristic: Thoughts blocks start with **Header** and are separated by newlines.
    // The final response usually follows a triple newline \n\n\n after the last thought.

    // 1. If content doesn't start with **, it's probably just content (or formatting bold).
    // But thoughts ALWAYS start with ** in this model.
    if (!content.trim().startsWith('**')) {
        return { thoughts: null, content };
    }

    // 2. Try splitting by triple newline.
    // The thoughts block ends with \n\n\n before the final answer starts.
    const parts = content.split('\n\n\n');

    if (parts.length > 1) {
        // Last part is likely content, previous parts are thoughts.
        // We join thoughts back with double newlines for cleaner display
        const thoughts = parts.slice(0, parts.length - 1).join('\n\n').trim();
        const finalContent = parts[parts.length - 1].trim();

        // Edge case: if we are streaming and just hit a \n\n\n but no content yet
        if (!finalContent && content.endsWith('\n\n\n')) {
            return { thoughts: content.trim(), content: '' };
        }

        return { thoughts, content: finalContent };
    }

    // 3. Fallback: If no triple newline found yet.
    // If it starts with **, and we are streaming (length < 1000?), treat as thoughts.
    // This prevents the "Thought" text from flashing as "Content" initially.
    if (content.trim().startsWith('**')) {
        return { thoughts: content, content: '' };
    }

    return { thoughts: null, content };
}

if (typeof window !== 'undefined') {
    window.parseModelOutput = parseModelOutput;
}
