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
            lastUpdated: 0,
            globalRoles: {
                chat: { providerId: 'google', model: 'google/gemini-3-pro-preview' },
                image: { providerId: 'google', model: 'gemini-3-pro-image-preview' }
            }
        };

        if (stored) {
            const parsed = JSON.parse(stored);
            settings = {
                ...settings,
                providers: parsed.providers || DEFAULT_PROVIDERS,
                activeId: parsed.activeId || 'google',
                lastUpdated: parsed.lastUpdated || 0,
                globalRoles: parsed.globalRoles || settings.globalRoles,
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
    globalRoles: initialState.globalRoles,

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
                    lastUpdated: now,
                    globalRoles: state.globalRoles
                }));
            } catch (e) {
                console.error('[Settings] Failed to persist config:', e);
            }
            return newState;
        });
    },

    setGlobalRole: (role, providerId, model) => {
        set(state => {
            const newGlobalRoles = {
                ...state.globalRoles,
                [role]: { providerId, model }
            };
            const updates = { globalRoles: newGlobalRoles, lastUpdated: Date.now() };
            if (role === 'chat') updates.activeId = providerId;

            try {
                localStorage.setItem(CONFIG_KEY, JSON.stringify({
                    providers: state.providers,
                    activeId: updates.activeId || state.activeId,
                    lastUpdated: updates.lastUpdated,
                    globalRoles: newGlobalRoles
                }));
            } catch (e) {
                console.error('[Settings] Failed to persist globalRoles:', e);
            }
            return updates;
        });
    },

    setActiveProvider: (id) => {
        set(state => {
            const newState = { activeId: id };
            try {
                localStorage.setItem(CONFIG_KEY, JSON.stringify({
                    providers: state.providers,
                    activeId: id,
                    lastUpdated: state.lastUpdated,
                    globalRoles: state.globalRoles
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

    // 获取当前有效的聊天配置（优先使用临时覆盖，其次使用全局 Role 配置）
    getEffectiveChatConfig: () => {
        const state = get();
        // 1. 检查是否有临时覆盖
        if (state.quickChatModel) {
            const pId = state.quickChatProviderId || state.globalRoles.chat.providerId;
            const provider = state.providers[pId] || state.providers['google'] || {};
            return {
                ...provider,
                model: state.quickChatModel,
                providerId: pId
            };
        }
        // 2. 使用全局 Role 配置
        const roleConfig = state.globalRoles.chat;
        const providerId = roleConfig?.providerId || 'google';
        const providerConfig = state.providers[providerId] || state.providers['google'] || {};
        const defaultModel = 'google/gemini-3-pro-preview';
        let modelToUse = roleConfig?.model || providerConfig.model || defaultModel;

        // Strip 'google/' prefix if provider is Gemini
        if (providerId === 'google' && modelToUse.startsWith('google/')) {
            modelToUse = modelToUse.replace('google/', '');
        }

        return {
            ...providerConfig,
            model: modelToUse,
            providerId: providerId
        };
    },

    // 获取当前有效的聊天模型 ID (用于 UI 显示)
    getEffectiveChatModel: () => {
        return get().getEffectiveChatConfig().model;
    },

    // 获取当前有效的绘画配置 (严格遵循设置，不支持快速切换)
    getEffectiveImageConfig: () => {
        return get().getRoleConfig('image');
    },


    // 获取特定角色的配置
    // 对话模型覆盖所有文本类任务 (分析、摘要等)
    getRoleConfig: (role) => {
        const state = get();
        if (role === 'image') {
            const roleConfig = state.globalRoles.image;
            const providerConfig = state.providers[roleConfig.providerId];
            return {
                ...providerConfig,
                model: roleConfig.model,
                providerId: roleConfig.providerId
            };
        }
        // 除了图片，全部走对话配置（支持画布快速切换）
        return state.getEffectiveChatConfig();
    },

    // Used by Cloud Sync
    setFullConfig: (config) => {
        const now = config.lastUpdated || Date.now();
        const newState = {
            providers: config.providers || DEFAULT_PROVIDERS,
            activeId: config.activeId || 'google',
            lastUpdated: now,
            globalRoles: config.globalRoles || initialState.globalRoles
        };
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(newState));
        } catch (e) {
            console.error('[Settings] Failed to persist full config:', e);
        }
        set({
            providers: newState.providers,
            activeId: newState.activeId,
            lastUpdated: newState.lastUpdated,
            globalRoles: newState.globalRoles
        });
    },

    // Selectors (Helpers)
    // [DEPRECATED] Use getRoleConfig('chat') instead
    getActiveConfig: () => {
        return get().getEffectiveChatConfig();
    },

    // 获取特定角色的模型 ID
    getRoleModel: (role) => {
        return get().getRoleConfig(role).model;
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

