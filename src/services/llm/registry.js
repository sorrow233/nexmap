const CONFIG_KEY = 'mixboard_providers_v3';

export const DEFAULT_PROVIDERS = {
    'google': {
        id: 'google',
        name: 'GMI Gemini',
        baseUrl: 'https://api.gmi-serving.com/v1',
        apiKey: '',
        model: 'google/gemini-3-pro-preview',
        protocol: 'gemini'
    }
};

export const DEFAULT_ROLES = {
    chat: 'google/gemini-3-pro-preview',
    analysis: 'google/gemini-3-flash-preview',
    image: ''
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
                    migrated.google.model = v2Config.model || 'google/gemini-3-pro-preview';

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

        // Add roles if missing
        if (!settings.roles) {
            const defaultModel = settings.providers[settings.activeId]?.model || 'google/gemini-3-pro-preview';
            settings.roles = {
                chat: defaultModel,
                analysis: defaultModel
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
    const newRoles = roles || DEFAULT_ROLES;
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ providers, activeId, roles: newRoles }));
};

export const getActiveConfig = () => {
    const { providers, activeId } = getProviderSettings();
    return providers[activeId] || DEFAULT_PROVIDERS['google'];
};

export const getRoleModel = (role) => {
    const settings = getProviderSettings();
    // If user explicitly set a model (even if empty), use it. Otherwise use default.
    const roleModel = settings.roles?.[role];
    if (roleModel !== undefined && roleModel !== null && roleModel !== '') {
        return roleModel;
    }
    // Fallback to provider's default model or system default
    const activeProvider = settings.providers[settings.activeId];
    return activeProvider?.model || DEFAULT_ROLES[role] || 'google/gemini-3-pro-preview';
};
