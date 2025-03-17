const CONFIG_KEY = 'mixboard_providers_v3';

export const DEFAULT_PROVIDERS = {
    'google': {
        id: 'google',
        name: 'GMI Gemini',
        baseUrl: 'https://api.gmi-serving.com/v1',
        apiKey: '',
        model: 'google/gemini-3-flash-preview',
        protocol: 'gemini'
    }
};

export const getProviderSettings = () => {
    try {
        const stored = localStorage.getItem(CONFIG_KEY);
        const settings = stored ? JSON.parse(stored) : null;

        if (!settings) {
            // MIGRATION FROM V2
            const v2ConfigStr = localStorage.getItem('mixboard_api_config_v2');
            if (v2ConfigStr) {
                try {
                    const v2Config = JSON.parse(v2ConfigStr);
                    const migrated = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS));
                    migrated.google.apiKey = v2Config.apiKey || '';
                    migrated.google.model = v2Config.model || 'google/gemini-3-flash-preview';

                    return {
                        providers: migrated,
                        activeId: 'google'
                    };
                } catch (e) { console.warn('Migration failed', e); }
            }
            return {
                providers: DEFAULT_PROVIDERS,
                activeId: 'google'
            };
        }

        // Clean up old roles data if exists
        if (settings.roles) {
            delete settings.roles;
        }

        return settings;
    } catch (e) {
        console.error('[LLM Config] Load failed:', e);
        return {
            providers: DEFAULT_PROVIDERS,
            activeId: 'google'
        };
    }
};

export const saveProviderSettings = (providers, activeId) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ providers, activeId }));
};

export const getActiveConfig = () => {
    const { providers, activeId } = getProviderSettings();
    return providers[activeId] || DEFAULT_PROVIDERS['google'];
};
