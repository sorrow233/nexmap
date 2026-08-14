const GEMINI_MAX_OUTPUT_TOKENS = 65536;
const GEMINI_THREE_FLASH_PATTERN = /(?:^|\/)gemini-3(?:\.\d+)?-flash(?:-|$)/;
const GEMINI_37_FLASH_PATTERN = /(?:^|\/)gemini-3\.7-flash(?:-|$)/;
const GEMINI_31_PRO_PREVIEW_PATTERN = /(?:^|\/)gemini-3\.1-pro-preview(?:-|$)/;

const normalizeModelName = (modelName = '') => String(modelName).trim().toLowerCase();

export const isGemini3FlashModel = (modelName = '') => (
    GEMINI_THREE_FLASH_PATTERN.test(normalizeModelName(modelName))
);

export const isGemini37FlashModel = (modelName = '') => (
    GEMINI_37_FLASH_PATTERN.test(normalizeModelName(modelName))
);

export const shouldDefaultGeminiThinkingHigh = (modelName = '') => {
    const normalized = normalizeModelName(modelName);
    return GEMINI_THREE_FLASH_PATTERN.test(normalized)
        || GEMINI_31_PRO_PREVIEW_PATTERN.test(normalized);
};

export const resolveGeminiDefaultMaxOutputTokens = (modelName = '') => {
    const normalized = normalizeModelName(modelName);
    if (
        GEMINI_37_FLASH_PATTERN.test(normalized)
        || GEMINI_31_PRO_PREVIEW_PATTERN.test(normalized)
    ) {
        return GEMINI_MAX_OUTPUT_TOKENS;
    }
    return null;
};

