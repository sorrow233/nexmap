const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const TRAILING_COMMA_RE = /,\s*([\]}])/g;
const LIST_PREFIX_RE = /^([-*+•]|\d+[\.\)]|\[[ xX]\])\s+/;

const normalizeMaxItems = (maxItems) => {
    if (Number.isInteger(maxItems) && maxItems > 0) return maxItems;
    return 4;
};

const stripMarkdownCodeFence = (text) => {
    let clean = String(text || '').trim();
    if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return clean;
};

const normalizeResponseText = (text) => String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(CONTROL_CHARS_RE, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();

const extractFirstBalancedArray = (text) => {
    const source = String(text || '');
    let start = -1;
    let depth = 0;
    let quote = null;
    let escaped = false;

    for (let i = 0; i < source.length; i += 1) {
        const ch = source[i];

        if (quote) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                escaped = true;
                continue;
            }
            if (ch === quote) quote = null;
            continue;
        }

        if (ch === '"' || ch === "'" || ch === '`') {
            quote = ch;
            continue;
        }

        if (ch === '[') {
            if (depth === 0) start = i;
            depth += 1;
            continue;
        }

        if (ch === ']' && depth > 0) {
            depth -= 1;
            if (depth === 0 && start >= 0) {
                return source.slice(start, i + 1);
            }
        }
    }

    return '';
};

const normalizeStringArray = (value, maxItems) => {
    if (!Array.isArray(value)) return [];

    const normalized = [];
    for (const item of value) {
        if (item === null || item === undefined) continue;
        const str = typeof item === 'string'
            ? item.trim()
            : (typeof item === 'number' || typeof item === 'boolean')
                ? String(item)
                : '';
        if (!str) continue;
        normalized.push(str);
        if (normalized.length >= maxItems) break;
    }

    return normalized;
};

const tryParseStrictJsonArray = (candidate, maxItems) => {
    const source = normalizeResponseText(candidate).replace(TRAILING_COMMA_RE, '$1');
    if (!source) return [];

    try {
        const parsed = JSON.parse(source);
        return normalizeStringArray(parsed, maxItems);
    } catch {
        return [];
    }
};

const decodeEscape = (char) => {
    switch (char) {
        case 'n': return '\n';
        case 'r': return '\r';
        case 't': return '\t';
        case 'b': return '\b';
        case 'f': return '\f';
        case 'v': return '\v';
        default: return char;
    }
};

const parseLooseStringArray = (candidate, maxItems) => {
    const source = extractFirstBalancedArray(candidate) || candidate;
    const start = source.indexOf('[');
    if (start < 0) return [];

    const result = [];
    let index = start + 1;

    const skipWhitespace = () => {
        while (index < source.length && /\s/.test(source[index])) {
            index += 1;
        }
    };

    while (index < source.length) {
        skipWhitespace();
        const ch = source[index];

        if (!ch || ch === ']') break;
        if (ch === ',') {
            index += 1;
            continue;
        }

        if (ch === '"' || ch === "'" || ch === '`') {
            const quote = ch;
            index += 1;
            let buffer = '';

            while (index < source.length) {
                const current = source[index];

                if (current === '\\') {
                    const next = source[index + 1];
                    if (next === undefined) {
                        index += 1;
                        break;
                    }
                    buffer += decodeEscape(next);
                    index += 2;
                    continue;
                }

                if (current === quote) {
                    let lookAhead = index + 1;
                    while (lookAhead < source.length && /\s/.test(source[lookAhead])) {
                        lookAhead += 1;
                    }

                    if (lookAhead >= source.length || source[lookAhead] === ',' || source[lookAhead] === ']') {
                        index += 1;
                        break;
                    }
                }

                buffer += current;
                index += 1;
            }

            const cleaned = buffer.trim();
            if (cleaned) {
                result.push(cleaned);
                if (result.length >= maxItems) return result;
            }
            continue;
        }

        const tokenStart = index;
        while (index < source.length && source[index] !== ',' && source[index] !== ']') {
            index += 1;
        }

        const token = source
            .slice(tokenStart, index)
            .trim()
            .replace(/^['"`]|['"`]$/g, '')
            .trim();

        if (token) {
            result.push(token);
            if (result.length >= maxItems) return result;
        }
    }

    return result;
};

const parseLineListFallback = (text, maxItems) => {
    const lines = String(text || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => line.replace(LIST_PREFIX_RE, '').trim())
        .filter(Boolean);

    if (lines.length < 2) return [];
    return lines.slice(0, maxItems);
};

const uniqueCandidates = (values) => {
    const seen = new Set();
    const unique = [];

    values.forEach((value) => {
        const key = String(value || '').trim();
        if (!key || seen.has(key)) return;
        seen.add(key);
        unique.push(key);
    });

    return unique;
};

export const parseStringArrayFromLLMResponse = (response, options = {}) => {
    const maxItems = normalizeMaxItems(options.maxItems);
    const stripped = normalizeResponseText(stripMarkdownCodeFence(response));
    if (!stripped) return [];

    const extracted = normalizeResponseText(extractFirstBalancedArray(stripped));
    const candidates = uniqueCandidates([extracted, stripped]);

    for (const candidate of candidates) {
        const strict = tryParseStrictJsonArray(candidate, maxItems);
        if (strict.length > 0) return strict;

        const loose = parseLooseStringArray(candidate, maxItems);
        if (loose.length > 0) return normalizeStringArray(loose, maxItems);
    }

    return parseLineListFallback(stripped, maxItems);
};

const mergeChunks = (chunks, maxSections) => {
    if (chunks.length <= maxSections) return chunks;

    const result = [];
    const bucketSize = Math.ceil(chunks.length / maxSections);

    for (let i = 0; i < chunks.length; i += bucketSize) {
        const merged = chunks.slice(i, i + bucketSize).join('\n\n').trim();
        if (merged) result.push(merged);
    }

    return result.slice(0, maxSections);
};

const cleanChunkList = (chunks) => chunks
    .map(chunk => String(chunk || '').trim())
    .filter(Boolean);

export const splitTextFallback = (text, options = {}) => {
    const maxSections = normalizeMaxItems(options.maxSections);
    const source = String(text || '').trim();
    if (!source) return [];

    const paragraphChunks = cleanChunkList(source.split(/\n\s*\n/));
    if (paragraphChunks.length >= 2) {
        return mergeChunks(paragraphChunks, maxSections);
    }

    const listChunks = cleanChunkList(source.split(/\n(?=\s*(?:\d+[\.\)]|[-*•])\s+)/));
    if (listChunks.length >= 2) {
        return mergeChunks(listChunks, maxSections);
    }

    if (source.length < 80) return [source];

    const sentenceChunks = cleanChunkList(source.match(/[^。！？!?\.]+[。！？!?\.]?/g) || []);
    if (sentenceChunks.length >= 2) {
        const grouped = [];
        const bucketSize = Math.ceil(sentenceChunks.length / Math.min(maxSections, sentenceChunks.length));
        for (let i = 0; i < sentenceChunks.length; i += bucketSize) {
            const merged = sentenceChunks.slice(i, i + bucketSize).join(' ').trim();
            if (merged) grouped.push(merged);
        }
        if (grouped.length > 0) return grouped.slice(0, maxSections);
    }

    const hardChunks = [];
    const targetSize = Math.ceil(source.length / maxSections);
    for (let i = 0; i < source.length && hardChunks.length < maxSections; i += targetSize) {
        const chunk = source.slice(i, i + targetSize).trim();
        if (chunk) hardChunks.push(chunk);
    }

    return hardChunks.length > 0 ? hardChunks : [source];
};
