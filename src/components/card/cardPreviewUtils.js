const CARD_PREVIEW_TEXT_LIMIT = 300;
const CARD_PREVIEW_SCAN_LIMIT = 6_000;
const CARD_TITLE_MAX_CHARS = 180;
const CARD_SUMMARY_SCAN_LIMIT = 2_400;
const CARD_SUMMARY_LINE_LIMIT = 4;
const CARD_SUMMARY_LINE_CHAR_LIMIT = 160;

export const CARD_PREVIEW_DIAGNOSTIC_THRESHOLD_MS = 40;

const clipText = (value = '', limit = CARD_PREVIEW_TEXT_LIMIT) => {
    const text = String(value || '').trim();
    if (text.length <= limit) return text;
    return `${text.slice(0, limit).trimEnd()}...`;
};

export const cleanThinkingTags = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
};

const cleanThinkingPreviewSample = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .replace(/<thinking>[\s\S]*$/i, '')
        .replace(/^[\s\S]*?<\/thinking>/i, '')
        .trim();
};

const collectContentTextSample = (content, scanLimit = CARD_PREVIEW_SCAN_LIMIT) => {
    if (!content) {
        return {
            text: 'No messages yet',
            sourceLength: 0,
            truncated: false
        };
    }

    if (typeof content === 'string') {
        return {
            text: content.slice(0, scanLimit),
            sourceLength: content.length,
            truncated: content.length > scanLimit
        };
    }

    if (!Array.isArray(content)) {
        return {
            text: 'Unknown content',
            sourceLength: 0,
            truncated: false
        };
    }

    let text = '';
    let sourceLength = 0;
    let hasImage = false;
    let truncated = false;

    for (const part of content) {
        if (part?.type === 'image' || part?.type === 'image_url') {
            hasImage = true;
            continue;
        }

        if (part?.type !== 'text' || typeof part.text !== 'string') {
            continue;
        }

        sourceLength += part.text.length;
        if (text.length >= scanLimit) {
            truncated = true;
            continue;
        }

        const remaining = scanLimit - text.length;
        text += `${text ? ' ' : ''}${part.text.slice(0, remaining)}`;
        if (part.text.length > remaining) {
            truncated = true;
        }
    }

    return {
        text: `${hasImage ? '[Image] ' : ''}${text}`,
        sourceLength,
        truncated
    };
};

export const getFullContentText = (content) => {
    if (!content) return 'No messages yet';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        const text = content.filter(p => p.type === 'text').map(p => p.text).join(' ');
        const hasImage = content.some(p => p.type === 'image' || p.type === 'image_url');
        return (hasImage ? '[Image] ' : '') + text;
    }
    return 'Unknown content';
};

export const normalizeCardPreviewTitle = (summaryTitle, fallbackTitle) => (
    String(summaryTitle || fallbackTitle || 'Untitled')
        .slice(0, CARD_TITLE_MAX_CHARS)
        .replace(/^#+\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/__/, '')
        .replace(/^\d+\.\s*/, '')
        .trim()
);

export const buildCardPreviewText = ({ marks = [], content = null } = {}) => {
    let text = '';
    let sourceLength = 0;
    let truncatedSource = false;

    if (marks.length > 0) {
        sourceLength = marks.reduce((total, mark) => total + String(mark || '').length, 0);
        text = marks
            .slice(0, CARD_SUMMARY_LINE_LIMIT)
            .map(m => `- **${clipText(m, CARD_SUMMARY_LINE_CHAR_LIMIT)}**`)
            .join('\n');
        truncatedSource = marks.length > CARD_SUMMARY_LINE_LIMIT || sourceLength > text.length;
    } else {
        const preview = collectContentTextSample(content);
        sourceLength = preview.sourceLength;
        truncatedSource = preview.truncated;
        text = cleanThinkingPreviewSample(preview.text);
    }

    if (!text) text = '_Thinking..._';

    return {
        text: clipText(text, CARD_PREVIEW_TEXT_LIMIT),
        sourceLength,
        truncatedSource,
        hasMarks: marks.length > 0
    };
};

export const buildSummaryPreviewLines = (summary = '') => {
    const source = typeof summary === 'string' ? summary : '';
    if (!source.trim()) return [];

    const sampled = source.slice(0, CARD_SUMMARY_SCAN_LIMIT);
    return sampled
        .split('\n')
        .map((line) => clipText(line.replace(/^[•-]\s*/, ''), CARD_SUMMARY_LINE_CHAR_LIMIT))
        .filter(Boolean)
        .slice(0, CARD_SUMMARY_LINE_LIMIT);
};
