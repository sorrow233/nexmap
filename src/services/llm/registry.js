const CONFIG_KEY = 'mixboard_providers_v3';

export const DEFAULT_PROVIDERS = {
    'google': {
        id: 'google',
        name: 'GMI Gemini (Native)',
        baseUrl: 'https://api.gmi-serving.com/v1',
        apiKey: '',
        model: 'google/gemini-3-flash-preview',
        protocol: 'gemini'
    },
    'openai-compatible': {
        id: 'openai-compatible',
        name: 'GMI OpenAI (Compatible)',
        baseUrl: 'https://api.gmi-serving.com/v1',
        apiKey: '',
        model: 'google/gemini-3-flash-preview',
        protocol: 'openai'
    }
};

export const getProviderSettings = () => {
    try {
        const stored = localStorage.getItem(CONFIG_KEY);
        const settings = stored ? JSON.parse(stored) : null;

        if (!settings) {
            const v2ConfigStr = localStorage.getItem('mixboard_api_config_v2');
            if (v2ConfigStr) {
                try {
                    const v2Config = JSON.parse(v2ConfigStr);
                    const migrated = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS));
                    const apiKey = v2Config.apiKey || '';
                    migrated.google.apiKey = apiKey;
                    migrated['openai-compatible'].apiKey = apiKey;

                    const targetModel = (v2Config.model && v2Config.model.indexOf('gemini') !== -1)
                        ? 'google/gemini-3-flash-preview'
                        : (v2Config.model || 'google/gemini-3-flash-preview');

                    migrated.google.model = targetModel;
                    migrated['openai-compatible'].model = targetModel;
                    return { providers: migrated, activeId: 'google' };
                } catch (e) { console.warn('Migration failed', e); }
            }
            return { providers: DEFAULT_PROVIDERS, activeId: 'google' };
        }
        return settings;
    } catch (e) {
        console.error('[LLM Config] Load failed:', e);
        return { providers: DEFAULT_PROVIDERS, activeId: 'google' };
    }
};

export const saveProviderSettings = (providers, activeId) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ providers, activeId }));
};

export const getActiveConfig = () => {
    const { providers, activeId } = getProviderSettings();
    return providers[activeId] || DEFAULT_PROVIDERS['google'];
};
