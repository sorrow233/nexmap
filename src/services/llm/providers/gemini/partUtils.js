const isTextPart = (part) => typeof part?.text === 'string' && part.text.length > 0;

const collectTextFromParts = (parts = [], { includeThought = false } = {}) => {
    if (!Array.isArray(parts) || parts.length === 0) return '';

    const visibleParts = parts.filter(part => {
        if (!isTextPart(part)) return false;
        if (includeThought) return true;
        return part.thought !== true;
    });

    return visibleParts.map(part => part.text).join('');
};

export function extractCandidateText(candidate, { includeThoughtFallback = true } = {}) {
    const parts = candidate?.content?.parts;
    const visibleText = collectTextFromParts(parts, { includeThought: false });
    if (visibleText) return visibleText;

    if (!includeThoughtFallback) return '';
    return collectTextFromParts(parts, { includeThought: true });
}

export function extractCandidateThoughtText(candidate) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) return '';
    return parts
        .filter(part => isTextPart(part) && part.thought === true)
        .map(part => part.text)
        .join('');
}

export function extractCandidateAllText(candidate) {
    return collectTextFromParts(candidate?.content?.parts, { includeThought: true });
}
