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
