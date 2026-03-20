const SUMMARY_THEME_ALIASES = {
    indigo: 'indigo',
    violet: 'purple',
    green: 'emerald',
    teal: 'emerald',
    red: 'orange',
    amber: 'orange',
    yellow: 'orange',
    gray: 'slate',
    grey: 'slate',
    neutral: 'slate'
};

const SUMMARY_THEME_SET = new Set(['blue', 'purple', 'indigo', 'emerald', 'orange', 'pink', 'slate']);

const normalizeLooseString = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        return String(value);
    }
    return value.trim();
};

export const normalizeBoardSummaryTheme = (value) => {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!normalized) return 'slate';

    const aliased = SUMMARY_THEME_ALIASES[normalized] || normalized;
    return SUMMARY_THEME_SET.has(aliased) ? aliased : 'slate';
};

export const normalizeBoardSummary = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;

    if (typeof value === 'string') {
        const summary = value.trim();
        return summary ? { summary, theme: 'slate' } : null;
    }

    if (typeof value !== 'object') {
        const summary = String(value).trim();
        return summary ? { summary, theme: 'slate' } : null;
    }

    const summary = typeof value.summary === 'string'
        ? value.summary.trim()
        : (typeof value.text === 'string' ? value.text.trim() : '');

    if (!summary) {
        return null;
    }

    return {
        summary,
        theme: normalizeBoardSummaryTheme(value.theme)
    };
};

export const getBoardSummaryText = (value) => normalizeBoardSummary(value)?.summary || '';

export const getBoardSummaryTheme = (value) => normalizeBoardSummary(value)?.theme || 'slate';

export const getBoardSummaryTags = (value) => getBoardSummaryText(value)
    .split(' · ')
    .map((tag) => tag.trim())
    .filter(Boolean);

export const normalizeBoardDisplayMetadata = (board = {}) => ({
    ...board,
    summary: normalizeBoardSummary(board.summary),
    backgroundImage: normalizeLooseString(board.backgroundImage),
    thumbnail: normalizeLooseString(board.thumbnail)
});
