const LEGACY_EMPTY_SHARE_STRINGS = new Set([
    'no content provided',
    '没有可导出的内容',
    '当前没有可导出的正文内容。',
    '当前这次导出没有拿到正文内容。请关闭后重新打开导出面板，再试一次。'
]);

const THINKING_TAG_PATTERN = /<thinking>[\s\S]*?<\/thinking>/gi;
const SHARE_ERROR_PATTERNS = [
    /^⚠️/i,
    /^error([\s:：-]|$)/i,
    /^(generation failed|request timeout|service unavailable|rate limited|system error)([\s:：,.!]|$)/i,
    /^(生成失败|请求超时|服务不可用|ai服务暂时不可用|系统错误|调用失败|网络错误)([\s:：，。！!]|$)/i,
    /^错误([:：-]|$)/i
];

function normalizePlaceholderCandidate(value) {
    return String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

function sanitizeShareSegment(value) {
    const normalizedValue = String(value || '')
        .replace(THINKING_TAG_PATTERN, ' ')
        .trim();
    if (!normalizedValue) return '';

    if (LEGACY_EMPTY_SHARE_STRINGS.has(normalizePlaceholderCandidate(normalizedValue))) {
        return '';
    }

    return normalizedValue;
}

function collectShareSegments(content, segments) {
    if (typeof content === 'string') {
        const sanitized = sanitizeShareSegment(content);
        if (sanitized) {
            segments.push(sanitized);
        }
        return;
    }

    if (Array.isArray(content)) {
        content.forEach((item) => collectShareSegments(item, segments));
        return;
    }

    if (!content || typeof content !== 'object') {
        return;
    }

    if ('text' in content) {
        collectShareSegments(content.text, segments);
        return;
    }

    if ('content' in content) {
        collectShareSegments(content.content, segments);
    }
}

export function normalizeShareContent(content) {
    const segments = [];
    collectShareSegments(content, segments);
    return segments.join('\n\n').trim();
}

export function hasShareableContent(content) {
    return Boolean(normalizeShareContent(content));
}

function normalizeErrorCandidate(content) {
    return normalizePlaceholderCandidate(content).replace(/^[#>*`_\-\s]+/, '');
}

export function isShareableMessageContent(content) {
    const normalizedContent = normalizeShareContent(content);
    if (!normalizedContent) return false;

    const normalizedErrorCandidate = normalizeErrorCandidate(normalizedContent);
    return !SHARE_ERROR_PATTERNS.some((pattern) => pattern.test(normalizedErrorCandidate));
}
