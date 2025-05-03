import { DEFAULT_PROVIDERS, DEFAULT_ROLES } from '../../services/llm/registry';

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
                roles: parsed.roles || DEFAULT_ROLES
            };
        }
    } catch (e) {
        console.warn('Failed to load settings from localStorage', e);
    }
    return {
        providers: DEFAULT_PROVIDERS,
        activeId: 'google',
        roles: DEFAULT_ROLES
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
    roles: initialState.roles,

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

    updateRoles: (newRoles) => {
        set(state => {
            const newState = { roles: newRoles };
            localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...state, ...newState }));
            return newState;
        });
    },

    // Used by Cloud Sync
    setFullConfig: (config) => {
        const newState = {
            providers: config.providers || DEFAULT_PROVIDERS,
            activeId: config.activeId || 'google',
            roles: config.roles || DEFAULT_ROLES
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
        // 1. Explicit role override
        const explicit = state.roles?.[role];
        if (explicit) return explicit;

        // 2. Active provider default
        const activeConfig = state.providers[state.activeId];
        return activeConfig?.model || DEFAULT_ROLES[role];
    }
});
