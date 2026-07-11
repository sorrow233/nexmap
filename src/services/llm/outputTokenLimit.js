export const resolveChatMaxOutputTokens = (options = {}) => {
    const candidates = [
        options?.maxOutputTokens,
        options?.max_output_tokens,
        options?.maxTokens,
        options?.max_tokens
    ];

    for (const value of candidates) {
        const normalized = Number(value);
        if (Number.isFinite(normalized) && normalized > 0) {
            return Math.floor(normalized);
        }
    }

    return null;
};

export const DEFAULT_CLAUDE_MAX_OUTPUT_TOKENS = 32768;

export const resolveModelMaxOutputTokens = (model = '', options = {}) => {
    const configuredLimit = resolveChatMaxOutputTokens(options);
    if (configuredLimit !== null) return configuredLimit;

    return String(model).toLowerCase().includes('claude')
        ? DEFAULT_CLAUDE_MAX_OUTPUT_TOKENS
        : null;
};
