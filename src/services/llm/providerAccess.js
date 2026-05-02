export const SYSTEM_CREDITS_PROVIDER_ID = 'system-credits';

const AUTH_REQUIRED_HOST_PATTERNS = [
    'api.openai.com',
    'api.gmi-serving.com',
    'console.gmicloud.ai',
    'generativelanguage.googleapis.com',
    'aiplatform.googleapis.com',
    'googleapis.com'
];

export function isExplicitSystemCreditsConfig(config = {}) {
    const protocol = String(config?.protocol || '').trim();
    const id = String(config?.id || config?.providerId || '').trim();
    return protocol === SYSTEM_CREDITS_PROVIDER_ID || id === SYSTEM_CREDITS_PROVIDER_ID;
}

export function getConfiguredProviderApiKeys(config = {}) {
    return String(config?.apiKeys || config?.apiKey || '')
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean);
}

function getProviderBaseUrlHost(config = {}) {
    const baseUrl = String(config?.baseUrl || '').trim();
    if (!baseUrl) return '';

    try {
        return new URL(baseUrl).hostname.toLowerCase();
    } catch {
        return '';
    }
}

function isHostedProviderBaseUrl(config = {}) {
    const host = getProviderBaseUrlHost(config);
    if (!host) return false;

    return AUTH_REQUIRED_HOST_PATTERNS.some((pattern) => (
        host === pattern || host.endsWith(`.${pattern}`)
    ));
}

export function isSelfHostedOpenAIConfig(config = {}) {
    if (isExplicitSystemCreditsConfig(config)) return false;
    if (config?.protocol === 'gemini') return false;

    const baseUrl = String(config?.baseUrl || '').trim();
    if (!baseUrl) return false;

    return !isHostedProviderBaseUrl(config);
}

export function providerRequiresApiKey(config = {}) {
    if (isExplicitSystemCreditsConfig(config)) return false;
    return !isSelfHostedOpenAIConfig(config);
}

export function hasUsableProviderRoute(config = {}) {
    if (isExplicitSystemCreditsConfig(config)) return true;
    return getConfiguredProviderApiKeys(config).length > 0 || isSelfHostedOpenAIConfig(config);
}
