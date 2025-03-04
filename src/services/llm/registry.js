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
    chat: {
        providerId: 'google',
        model: 'google/gemini-3-flash-preview'
    },
    extraction: {
        providerId: 'google',
        model: 'google/gemini-3-flash-preview'
    },
    analysis: {
        providerId: 'google',
        model: 'google/gemini-3-flash-preview'
    },
    image: {
        providerId: 'google',
        model: 'google/gemini-3-flash-preview'
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
                        roles: JSON.parse(JSON.stringify(DEFAULT_ROLES))
                    };
                } catch (e) { console.warn('Migration failed', e); }
            }
            return {
                providers: DEFAULT_PROVIDERS,
                activeId: 'google',
                roles: DEFAULT_ROLES
            };
        }

        // MIGRATION: Convert old string-based roles to object-based roles
        if (settings.roles && typeof settings.roles.chat === 'string') {
            const newRoles = {};
            for (const [roleKey, providerId] of Object.entries(settings.roles)) {
                const provider = settings.providers[providerId];
                newRoles[roleKey] = {
                    providerId: providerId,
                    model: provider ? provider.model : 'google/gemini-3-flash-preview'
                };
            }
            settings.roles = newRoles;
        }

        // BACKFILL ROLES IF MISSING
        if (!settings.roles) {
            const active = settings.activeId || 'google';
            const model = settings.providers[active]?.model || 'google/gemini-3-flash-preview';
            settings.roles = {
                chat: { providerId: active, model },
                extraction: { providerId: active, model },
                analysis: { providerId: active, model },
                image: { providerId: active, model }
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
    const roleConfig = roles && roles.chat ? roles.chat : DEFAULT_ROLES.chat;
    const provider = providers[roleConfig.providerId] || DEFAULT_PROVIDERS['google'];

    // Return provider with overridden model
    return {
        ...provider,
        model: roleConfig.model || provider.model
    };
};
