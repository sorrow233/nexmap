export const DEFAULT_CHAT_MAX_OUTPUT_TOKENS = 32768;

export const resolveChatMaxOutputTokens = (options = {}, fallback = DEFAULT_CHAT_MAX_OUTPUT_TOKENS) => {
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

    return fallback;
};
