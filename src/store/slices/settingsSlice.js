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
    setIsSettingsOpen: (val) => set({ isSettingsOpen: typeof val === 'function' ? val() : val }),

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
            // Persist
            localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...state, ...newState }));
            return newState;
        });
    },

    setActiveProvider: (id) => {
        set(state => {
            const newState = { activeId: id };
            localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...state, ...newState }));
            return newState;
        });
    },



    // Used by Cloud Sync
    setFullConfig: (config) => {
        const newState = {
            providers: config.providers || DEFAULT_PROVIDERS,
            activeId: config.activeId || 'google'
        };
        localStorage.setItem(CONFIG_KEY, JSON.stringify(newState));
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
    }
});
