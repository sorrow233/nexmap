import { DEFAULT_PROVIDERS } from '../../services/llm/registry';

const CONFIG_KEY = 'mixboard_providers_v3';
const QUICK_MODEL_KEY = 'mixboard_quick_models';

// Helper to load initial settings from local storage
const loadInitialSettings = () => {
    try {
        const stored = localStorage.getItem(CONFIG_KEY);
        const quickModels = localStorage.getItem(QUICK_MODEL_KEY);

        let settings = {
            providers: DEFAULT_PROVIDERS,
            activeId: 'google',
        };

        if (stored) {
            const parsed = JSON.parse(stored);
            settings = {
                providers: parsed.providers || DEFAULT_PROVIDERS,
                activeId: parsed.activeId || 'google',
                lastUpdated: parsed.lastUpdated || 0,
            };
        }

        // 加载快速模型切换状态
        if (quickModels) {
            const parsedQuick = JSON.parse(quickModels);
            settings.quickChatModel = parsedQuick.quickChatModel || null;
            settings.quickChatProviderId = parsedQuick.quickChatProviderId || null;
        }

        return settings;
    } catch (e) {
        console.warn('Failed to load settings from localStorage', e);
    }

    return {
        providers: DEFAULT_PROVIDERS,
        activeId: 'google',
        lastUpdated: 0,
        quickChatModel: null,
        quickChatProviderId: null,
    };
};

const initialState = loadInitialSettings();

export const createSettingsSlice = (set, get) => ({
    // ... UI State ...
    isSettingsOpen: false,
    setIsSettingsOpen: (val) => set((state) => ({ isSettingsOpen: typeof val === 'function' ? val(state.isSettingsOpen) : val })),

    // ... Offline Mode ...
    offlineMode: localStorage.getItem('mixboard_offline_mode') === 'true',
    autoOfflineTriggered: false,

    setOfflineMode: (enabled) => {
        localStorage.setItem('mixboard_offline_mode', enabled ? 'true' : 'false');
        set({ offlineMode: enabled, autoOfflineTriggered: false });
    },

    triggerAutoOffline: () => {
        if (!get().offlineMode) {
            localStorage.setItem('mixboard_offline_mode', 'true');
            set({ offlineMode: true, autoOfflineTriggered: true });
        }
    },

    // Data State
    providers: initialState.providers,
    activeId: initialState.activeId,
    lastUpdated: initialState.lastUpdated || 0,

    // 快速模型切换（画布临时覆盖）- 仅针对对话角色 (Chat Role)
    quickChatModel: initialState.quickChatModel,
    quickChatProviderId: initialState.quickChatProviderId,

    // Actions
    updateProviderConfig: (providerId, updates) => {
        set(state => {
            const newProviders = {
                ...state.providers,
                [providerId]: { ...state.providers[providerId], ...updates }
            };
            const now = Date.now();
            const newState = { providers: newProviders, lastUpdated: now };
            try {
                localStorage.setItem(CONFIG_KEY, JSON.stringify({
                    providers: newProviders,
                    activeId: state.activeId,
                    lastUpdated: now
                }));
            } catch (e) {
                console.error('[Settings] Failed to persist config:', e);
            }
            return newState;
        });
    },

    setActiveProvider: (id) => {
        set(state => {
            const newState = { activeId: id };
            try {
                localStorage.setItem(CONFIG_KEY, JSON.stringify({
                    providers: state.providers,
                    activeId: id
                }));
            } catch (e) {
                console.error('[Settings] Failed to persist activeId:', e);
            }
            return newState;
        });
    },

    // 快速模型切换 Actions (隔离 Session)
    setQuickChatModel: (modelId, providerId = null) => {
        set({ quickChatModel: modelId, quickChatProviderId: providerId });
        try {
            const current = JSON.parse(localStorage.getItem(QUICK_MODEL_KEY) || '{}');
            localStorage.setItem(QUICK_MODEL_KEY, JSON.stringify({
                ...current,
                quickChatModel: modelId,
                quickChatProviderId: providerId
            }));
        } catch (e) {
            console.error('[Settings] Failed to persist quickChatModel:', e);
        }
    },

    // 获取当前有效的聊天配置（优先使用临时覆盖，不改动全局 activeId）
    getEffectiveChatConfig: () => {
        const state = get();
        // 1. 检查是否有临时覆盖
        if (state.quickChatModel) {
            const pId = state.quickChatProviderId || state.activeId;
            return {
                model: state.quickChatModel,
                providerId: pId,
                ...state.providers[pId]
            };
        }
        // 2. 使用全局默认配置
        const activeConfig = state.providers[state.activeId];
        return {
            model: activeConfig?.roles?.chat || activeConfig?.model || 'google/gemini-3-pro-preview',
            providerId: state.activeId,
            ...activeConfig
        };
    },

    // 获取当前有效的绘画配置 (严格遵循设置，不支持快速切换)
    getEffectiveImageConfig: () => {
        return get().getRoleConfig('image');
    },


    // 获取特定角色的配置（如分析模型、图片模型），严格遵循 activeId
    getRoleConfig: (role) => {
        const state = get();
        const activeConfig = state.providers[state.activeId];
        const model = activeConfig?.roles?.[role] || activeConfig?.model || 'google/gemini-3-pro-preview';
        return {
            model,
            providerId: state.activeId,
            ...activeConfig
        };
    },

    // Used by Cloud Sync
    setFullConfig: (config) => {
        const now = config.lastUpdated || Date.now();
        const newState = {
            providers: config.providers || DEFAULT_PROVIDERS,
            activeId: config.activeId || 'google',
            lastUpdated: now
        };
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(newState));
        } catch (e) {
            console.error('[Settings] Failed to persist full config:', e);
        }
        set({ providers: newState.providers, activeId: newState.activeId, lastUpdated: newState.lastUpdated });
    },

    // Selectors (Helpers)
    getActiveConfig: () => {
        const state = get();
        return state.providers[state.activeId] || DEFAULT_PROVIDERS['google'];
    },

    getRoleModel: (role) => {
        const state = get();
        const activeConfig = state.providers[state.activeId];

        // 1. Check for specific role assignment in provider
        const providerRole = activeConfig?.roles?.[role];
        if (providerRole) return providerRole;

        // 2. Fallback to main model for everything if not specified
        return activeConfig?.model || 'google/gemini-3-pro-preview';
    },

    // Reset settings state on logout
    resetSettingsState: () => {
        const defaultState = {
            providers: DEFAULT_PROVIDERS,
            activeId: 'google',
            isSettingsOpen: false,
            quickChatModel: null,
            quickChatProviderId: null,
        };
        // Clear persisted settings
        localStorage.removeItem(CONFIG_KEY);
        localStorage.removeItem(QUICK_MODEL_KEY);
        set(defaultState);
    }
});

