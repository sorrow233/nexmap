const LEGACY_EMPTY_SHARE_STRINGS = new Set([
    'no content provided',
    '没有可导出的内容',
    '当前没有可导出的正文内容。',
    '当前这次导出没有拿到正文内容。请关闭后重新打开导出面板，再试一次。'
]);

function normalizePlaceholderCandidate(value) {
    return String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

function sanitizeShareSegment(value) {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) return '';

    if (LEGACY_EMPTY_SHARE_STRINGS.has(normalizePlaceholderCandidate(normalizedValue))) {
        return '';
    }

    return normalizedValue;
}

export function normalizeShareContent(content) {
    if (typeof content === 'string') {
        return sanitizeShareSegment(content);
    }

    if (Array.isArray(content)) {
        return content
            .map((item) => {
                if (typeof item === 'string') return sanitizeShareSegment(item);
                if (item && typeof item.text === 'string') return sanitizeShareSegment(item.text);
                if (item && typeof item.content === 'string') return sanitizeShareSegment(item.content);
                return '';
            })
            .filter(Boolean)
            .join('\n\n');
    }

    if (content && typeof content === 'object') {
        if (typeof content.text === 'string') return sanitizeShareSegment(content.text);
        if (typeof content.content === 'string') return sanitizeShareSegment(content.content);
    }

    return '';
}

export function hasShareableContent(content) {
    return Boolean(normalizeShareContent(content));
}
