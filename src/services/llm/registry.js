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

export const DEFAULT_ROLES = {
    chat: 'google',       // Main chat
    extraction: 'google', // Title gen, summary
    analysis: 'google',   // Follow-up, reasoning
    image: 'google'       // Image gen
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
                    const apiKey = v2Config.apiKey || '';
                    migrated.google.apiKey = apiKey;
                    migrated['openai-compatible'].apiKey = apiKey;

                    const targetModel = (v2Config.model && v2Config.model.indexOf('gemini') !== -1)
                        ? 'google/gemini-3-flash-preview'
                        : (v2Config.model || 'google/gemini-3-flash-preview');

                    migrated.google.model = targetModel;
                    migrated['openai-compatible'].model = targetModel;

                    // In V2 we only had one provider, so assign it to all roles
                    return {
                        providers: migrated,
                        activeId: 'google',
                        roles: { ...DEFAULT_ROLES }
                    };
                } catch (e) { console.warn('Migration failed', e); }
            }
            return {
                providers: DEFAULT_PROVIDERS,
                activeId: 'google',
                roles: DEFAULT_ROLES
            };
        }

        // BACKFILL ROLES IF MISSING (Migration from early V3)
        if (!settings.roles) {
            const active = settings.activeId || 'google';
            settings.roles = {
                chat: active,
                extraction: active,
                analysis: active,
                image: active
            };
        }

        return settings;
    } catch (e) {
        console.error('[LLM Config] Load failed:', e);
        return {
            providers: DEFAULT_PROVIDERS,
            activeId: 'google',
            roles: DEFAULT_ROLES
        };
    }
};

export const saveProviderSettings = (providers, activeId, roles) => {
    // If roles param is missing, we might be calling from legacy code, 
    // but ideally we update all callsites. 
    // Fallback: if roles not provided, try to preserve existing or default.
    let newRoles = roles;
    if (!newRoles) {
        const current = getProviderSettings();
        newRoles = current.roles || DEFAULT_ROLES;
    }

    localStorage.setItem(CONFIG_KEY, JSON.stringify({ providers, activeId, roles: newRoles }));
};

export const getActiveConfig = () => {
    // Legacy support: "Active Config" usually implies "Chat Config"
    const { providers, roles } = getProviderSettings();
    const roleId = roles && roles.chat ? roles.chat : 'google';
    return providers[roleId] || DEFAULT_PROVIDERS['google'];
};
