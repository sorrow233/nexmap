/**
 * parseModelOutput
 * 
 * Extracts <thinking> tags from LLM output.
 * 
 * @param {string} text - The raw text from the LLM.
 * @returns {object} - { thoughts: string|null, content: string }
 */
export const parseModelOutput = (text) => {
    if (typeof text !== 'string') return { thoughts: null, content: text };

    const thinkMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
    if (thinkMatch) {
        return {
            thoughts: thinkMatch[1].trim(),
            content: text.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim()
        };
    }

    return { thoughts: null, content: text };
};
