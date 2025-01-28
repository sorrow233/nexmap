
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
        const thoughtsPart = parts.slice(0, parts.length - 1).join('\n\n').trim();
        const finalContent = parts[parts.length - 1].trim();

        // Only treat as thoughts if it actually looks like thoughts (starts with ** or contains thinking keywords)
        if (thoughtsPart.startsWith('**') || thoughtsPart.toLowerCase().includes('thinking')) {
            // Edge case: if we are streaming and just hit a \n\n\n but no content yet
            if (!finalContent && content.endsWith('\n\n\n')) {
                return { thoughts: thoughtsPart, content: '' };
            }
            return { thoughts: thoughtsPart, content: finalContent };
        }
    }

    // 3. Strict Thinking Tag Check (Standard for o1-like models)
    const thinkMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    if (thinkMatch) {
        return {
            thoughts: thinkMatch[1].trim(),
            content: content.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim()
        };
    }

    // 4. Default: No thoughts found, keep everything as content (including bold headers)
    return { thoughts: null, content };
}

if (typeof window !== 'undefined') {
    window.parseModelOutput = parseModelOutput;
}
