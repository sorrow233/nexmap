import { DEFAULT_PROVIDERS } from '../../services/llm/registry';

const CONFIG_KEY = 'mixboard_providers_v3';

// Helper to load initial settings from local storage
const loadInitialSettings = () => {
    try {
        const stored = localStorage.getItem(CONFIG_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                providers: parsed.providers || DEFAULT_PROVIDERS,
                activeId: parsed.activeId || 'google',
            };
        }
    } catch (e) {
        console.warn('Failed to load settings from localStorage', e);
    }
    return {
        providers: DEFAULT_PROVIDERS,
        activeId: 'google',
    };
};

const initialState = loadInitialSettings();

export const createSettingsSlice = (set, get) => ({
    // UI State
    isSettingsOpen: false,
    setIsSettingsOpen: (val) => set((state) => ({ isSettingsOpen: typeof val === 'function' ? val(state.isSettingsOpen) : val })),

    // Data State
    providers: initialState.providers,
    activeId: initialState.activeId,

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
        if (providerRole) return providerRole;

        // 2. Fallback to main model for everything if not specified
        return activeConfig?.model || 'google/gemini-3-pro-preview';
    },

    // Reset settings state on logout
    resetSettingsState: () => {
        const defaultState = {
            providers: DEFAULT_PROVIDERS,
            activeId: 'google',
            isSettingsOpen: false
        };
        // Clear persisted settings
        localStorage.removeItem(CONFIG_KEY);
        set(defaultState);
    }
});

