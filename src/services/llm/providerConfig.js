export const PROVIDER_AUTH_MODE_API_KEY = 'api-key';
export const PROVIDER_AUTH_MODE_VERTEX_SERVICE_ACCOUNT = 'vertex-service-account';

export const DEFAULT_VERTEX_BASE_URL = 'https://aiplatform.googleapis.com/v1/publishers/google';
export const DEFAULT_VERTEX_CHAT_MODEL = 'gemini-2.5-flash';
export const DEFAULT_VERTEX_CUSTOM_MODELS = 'gemini-2.5-flash, gemini-2.5-pro, gemini-2.5-flash-lite';

export function isManagedVertexServiceAccountConfig(config = {}) {
    return config?.protocol === 'gemini'
        && String(config?.authMode || '').trim() === PROVIDER_AUTH_MODE_VERTEX_SERVICE_ACCOUNT;
}

export function hasUsableProviderCredentials(config = {}) {
    if (isManagedVertexServiceAccountConfig(config)) {
        return true;
    }

    return String(config?.apiKeys || config?.apiKey || '')
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean)
        .length > 0;
}

export function normalizeVertexApiKeyProvider(provider = {}) {
    const nextProvider = { ...provider };
    const currentModel = String(nextProvider.model || '').trim();
    const currentBaseUrl = String(nextProvider.baseUrl || '').trim();

    if (nextProvider.authMode === PROVIDER_AUTH_MODE_VERTEX_SERVICE_ACCOUNT) {
        nextProvider.authMode = PROVIDER_AUTH_MODE_API_KEY;
    }

    if (nextProvider.protocol === 'gemini') {
        if (!currentBaseUrl || currentBaseUrl.includes('api.gmi-serving.com') || currentBaseUrl.includes('api.openai.com')) {
            nextProvider.baseUrl = DEFAULT_VERTEX_BASE_URL;
        }

        if (!currentModel || currentModel === 'gpt-4o' || currentModel.includes('gemini-3-') || currentModel.startsWith('google/gemini-3-')) {
            nextProvider.model = DEFAULT_VERTEX_CHAT_MODEL;
        }

        if (!String(nextProvider.customModels || '').trim()) {
            nextProvider.customModels = DEFAULT_VERTEX_CUSTOM_MODELS;
        }
    }

    return nextProvider;
}
