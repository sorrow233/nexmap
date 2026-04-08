export const DEFAULT_GMI_PROXY_BASE_URL = 'https://api.gmi-serving.com/v1';
export const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_VERTEX_EXPRESS_BASE_URL = 'https://aiplatform.googleapis.com/v1/publishers/google';
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

export function splitGeminiApiKeys(apiKeys = '') {
    return String(apiKeys || '')
        .split(',')
        .map(key => key.trim())
        .filter(Boolean);
}

export function classifyGeminiApiKey(apiKey = '') {
    const normalized = String(apiKey || '').trim();
    if (!normalized) return 'missing';
    if (normalized.startsWith('AIza')) return 'AIza';
    if (normalized.startsWith('AQ.')) return 'AQ';
    if (normalized.startsWith('sk-')) return 'sk';
    return 'custom';
}

export function isLegacyGmiBaseUrl(baseUrl = '') {
    return String(baseUrl || '').includes('api.gmi-serving.com');
}

export function isOfficialGeminiBaseUrl(baseUrl = '') {
    return String(baseUrl || '').includes('generativelanguage.googleapis.com');
}

export function isVertexExpressBaseUrl(baseUrl = '') {
    return String(baseUrl || '').includes('aiplatform.googleapis.com');
}

export function isDefaultOpenAIBaseUrl(baseUrl = '') {
    return String(baseUrl || '').trim() === DEFAULT_OPENAI_BASE_URL;
}

function inferPreferredGoogleBaseUrl(apiKeys = []) {
    if (!Array.isArray(apiKeys) || apiKeys.length === 0) {
        return '';
    }

    const keyKinds = new Set(apiKeys.map(classifyGeminiApiKey));
    if (keyKinds.size !== 1) {
        return '';
    }

    if (keyKinds.has('AQ')) {
        return DEFAULT_VERTEX_EXPRESS_BASE_URL;
    }

    if (keyKinds.has('AIza')) {
        return DEFAULT_GEMINI_BASE_URL;
    }

    return '';
}

export function resolveGeminiBaseUrl(baseUrl = '', apiKey = '') {
    const normalizedBaseUrl = String(baseUrl || '').trim();
    const preferredGoogleBaseUrl = inferPreferredGoogleBaseUrl(splitGeminiApiKeys(apiKey));

    if (
        preferredGoogleBaseUrl &&
        (
            !normalizedBaseUrl ||
            isLegacyGmiBaseUrl(normalizedBaseUrl) ||
            isDefaultOpenAIBaseUrl(normalizedBaseUrl) ||
            isOfficialGeminiBaseUrl(normalizedBaseUrl) ||
            isVertexExpressBaseUrl(normalizedBaseUrl)
        )
    ) {
        return preferredGoogleBaseUrl;
    }

    if (isLegacyGmiBaseUrl(normalizedBaseUrl) || isDefaultOpenAIBaseUrl(normalizedBaseUrl)) {
        return normalizedBaseUrl || DEFAULT_GEMINI_BASE_URL;
    }

    if (normalizedBaseUrl) {
        return normalizedBaseUrl;
    }

    return preferredGoogleBaseUrl || DEFAULT_GEMINI_BASE_URL;
}

export function normalizeGeminiProviderConfig(provider = {}) {
    if (provider?.protocol !== 'gemini') {
        return provider;
    }

    const rawBaseUrl = String(provider?.baseUrl || '').trim();
    const nextBaseUrl = resolveGeminiBaseUrl(rawBaseUrl, provider?.apiKeys || provider?.apiKey || '');
    const shouldAdoptResolvedBaseUrl = !rawBaseUrl ||
        isLegacyGmiBaseUrl(rawBaseUrl) ||
        isDefaultOpenAIBaseUrl(rawBaseUrl) ||
        isOfficialGeminiBaseUrl(rawBaseUrl) ||
        isVertexExpressBaseUrl(rawBaseUrl);

    if (!shouldAdoptResolvedBaseUrl || nextBaseUrl === rawBaseUrl) {
        return provider;
    }

    return {
        ...provider,
        baseUrl: nextBaseUrl
    };
}
