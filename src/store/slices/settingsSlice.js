import { DEFAULT_PROVIDERS } from '../../services/llm/registry';

const CONFIG_KEY = 'mixboard_providers_v3';

// Helper to load initial settings from local storage
const loadInitialSettings = () => {
    try {
        const stored = localStorage.getItem(CONFIG_KEY);
        console.log('[Settings] Loading from localStorage, raw:', stored?.substring(0, 200) + '...');
        if (stored) {
            const parsed = JSON.parse(stored);
            console.log('[Settings] Parsed config - activeId:', parsed.activeId);
            console.log('[Settings] Parsed config - providers keys:', Object.keys(parsed.providers || {}));
            console.log('[Settings] Google provider roles:', JSON.stringify(parsed.providers?.google?.roles));
            return {
                providers: parsed.providers || DEFAULT_PROVIDERS,
                activeId: parsed.activeId || 'google',
            };
        }
    } catch (e) {
        console.warn('Failed to load settings from localStorage', e);
    }
    console.log('[Settings] Using DEFAULT_PROVIDERS');
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
        console.log('[Settings] setFullConfig called with:', JSON.stringify(config, null, 2));
        const newState = {
            providers: config.providers || DEFAULT_PROVIDERS,
            activeId: config.activeId || 'google'
        };
        console.log('[Settings] New state to save:', JSON.stringify(newState, null, 2));
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(newState));
            console.log('[Settings] Successfully saved to localStorage');
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

        // Debug log for model selection
        console.log(`[getRoleModel] Role: ${role}, ProviderRole: "${providerRole}", MainModel: "${activeConfig?.model}", ActiveId: ${state.activeId}`);

        if (providerRole) {
            console.log(`[getRoleModel] → Using role-specific model: ${providerRole}`);
            return providerRole;
        }

        // 2. Fallback to main model for everything if not specified
        const fallback = activeConfig?.model || 'google/gemini-3-pro-preview';
        console.log(`[getRoleModel] → Using fallback model: ${fallback}`);
        return fallback;
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

