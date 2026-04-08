export const PROVIDER_AUTH_MODE_API_KEY = 'api-key';
export const PROVIDER_AUTH_MODE_VERTEX_SERVICE_ACCOUNT = 'vertex-service-account';

export const DEFAULT_VERTEX_BASE_URL = 'https://us-central1-aiplatform.googleapis.com/v1/publishers/google';
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
