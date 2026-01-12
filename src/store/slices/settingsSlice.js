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
            };
        }

        // 加载快速模型切换状态
        if (quickModels) {
            const parsedQuick = JSON.parse(quickModels);
            settings.quickChatModel = parsedQuick.quickChatModel || null;
            settings.quickImageModel = parsedQuick.quickImageModel || null;
        }

        return settings;
    } catch (e) {
        console.warn('Failed to load settings from localStorage', e);
    }

    return {
        providers: DEFAULT_PROVIDERS,
        activeId: 'google',
        quickChatModel: null,
        quickImageModel: null,
    };
};

const initialState = loadInitialSettings();

export const createSettingsSlice = (set, get) => ({
    // UI State
    isSettingsOpen: false,
    setIsSettingsOpen: (val) => set((state) => ({ isSettingsOpen: typeof val === 'function' ? val(state.isSettingsOpen) : val })),

    // Offline Mode - reduces cloud sync to save quota
    offlineMode: localStorage.getItem('mixboard_offline_mode') === 'true',
    autoOfflineTriggered: false, // True if quota exhausted triggered offline mode

    setOfflineMode: (enabled) => {
        localStorage.setItem('mixboard_offline_mode', enabled ? 'true' : 'false');
        set({ offlineMode: enabled, autoOfflineTriggered: false });
    },

    // Called when quota is exhausted - auto-enable offline mode
    triggerAutoOffline: () => {
        if (!get().offlineMode) {
            console.warn('[Settings] Quota exhausted - auto-enabling offline mode');
            localStorage.setItem('mixboard_offline_mode', 'true');
            set({ offlineMode: true, autoOfflineTriggered: true });
        }
    },

    // Data State
    providers: initialState.providers,
    activeId: initialState.activeId,

    // 快速模型切换（画布临时覆盖）
    quickChatModel: initialState.quickChatModel,
    quickImageModel: initialState.quickImageModel,

    // Actions
    updateProviderConfig: (providerId, updates) => {
        set(state => {
            const newProviders = {
                ...state.providers,
                [providerId]: { ...state.providers[providerId], ...updates }
            };
            const newState = { providers: newProviders };
            // Persist with error handling
            try {
                localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...state, ...newState }));
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
                localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...state, ...newState }));
            } catch (e) {
                console.error('[Settings] Failed to persist activeId:', e);
            }
            return newState;
        });
    },

    // 快速模型切换 Actions
    setQuickChatModel: (model) => {
        set({ quickChatModel: model });
        try {
            const current = JSON.parse(localStorage.getItem(QUICK_MODEL_KEY) || '{}');
            localStorage.setItem(QUICK_MODEL_KEY, JSON.stringify({ ...current, quickChatModel: model }));
        } catch (e) {
            console.error('[Settings] Failed to persist quickChatModel:', e);
        }
    },

    setQuickImageModel: (model) => {
        set({ quickImageModel: model });
        try {
            const current = JSON.parse(localStorage.getItem(QUICK_MODEL_KEY) || '{}');
            localStorage.setItem(QUICK_MODEL_KEY, JSON.stringify({ ...current, quickImageModel: model }));
        } catch (e) {
            console.error('[Settings] Failed to persist quickImageModel:', e);
        }
    },

    // 获取当前有效的聊天模型（优先使用快速模型）
    getEffectiveChatModel: () => {
        const state = get();
        if (state.quickChatModel) {
            return state.quickChatModel;
        }
        const activeConfig = state.providers[state.activeId];
        return activeConfig?.roles?.chat || activeConfig?.model || 'google/gemini-3-pro-preview';
    },

    // 获取当前有效的绘画模型（优先使用快速模型）
    getEffectiveImageModel: () => {
        const state = get();
        if (state.quickImageModel) {
            return state.quickImageModel;
        }
        const activeConfig = state.providers[state.activeId];
        return activeConfig?.roles?.image || 'gemini-3-pro-image-preview';
    },



    // Used by Cloud Sync
    setFullConfig: (config) => {

        const newState = {
            providers: config.providers || DEFAULT_PROVIDERS,
            activeId: config.activeId || 'google'
        };

        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(newState));

        } catch (e) {
            console.error('[Settings] Failed to persist full config:', e);
        }
        set(newState);
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



        if (providerRole) {

            return providerRole;
        }

        // 2. Fallback to main model for everything if not specified
        const fallback = activeConfig?.model || 'google/gemini-3-pro-preview';

        return fallback;
    },

    // Reset settings state on logout
    resetSettingsState: () => {
        const defaultState = {
            providers: DEFAULT_PROVIDERS,
            activeId: 'google',
            isSettingsOpen: false,
            quickChatModel: null,
            quickImageModel: null
        };
        // Clear persisted settings
        localStorage.removeItem(CONFIG_KEY);
        localStorage.removeItem(QUICK_MODEL_KEY);
        set(defaultState);
    }
});

