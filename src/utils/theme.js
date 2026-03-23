const ROOT_DARK_CLASS = 'dark';
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';
const THEME_STORE_KEY = '__NEXMAP_THEME_STORE__';

const createThemeStore = () => ({
    matcher: null,
    started: false,
    isDark: null,
    listeners: new Set(),
    removeSystemListener: null
});

const getThemeStore = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!window[THEME_STORE_KEY]) {
        window[THEME_STORE_KEY] = createThemeStore();
    }

    return window[THEME_STORE_KEY];
};

const getThemeMatcher = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return null;
    }

    const store = getThemeStore();
    if (!store.matcher) {
        store.matcher = window.matchMedia(SYSTEM_DARK_QUERY);
    }

    return store.matcher;
};

const resolveSystemDarkPreference = () => getThemeMatcher()?.matches ?? false;

const notifyThemeListeners = (isDark) => {
    const store = getThemeStore();
    if (!store) {
        return;
    }

    for (const listener of [...store.listeners]) {
        try {
            listener(isDark);
        } catch (error) {
            console.error('[theme] listener failed', error);
        }
    }
};

export const syncDocumentTheme = (isDark = resolveSystemDarkPreference()) => {
    const normalizedIsDark = Boolean(isDark);

    if (typeof document !== 'undefined') {
        const root = document.documentElement;
        const previousIsDark = root.classList.contains(ROOT_DARK_CLASS);

        root.classList.toggle(ROOT_DARK_CLASS, normalizedIsDark);
        root.style.colorScheme = normalizedIsDark ? 'dark' : 'light';

        const store = getThemeStore();
        if (store) {
            store.isDark = normalizedIsDark;
        }

        if (previousIsDark !== normalizedIsDark) {
            notifyThemeListeners(normalizedIsDark);
        }

        return normalizedIsDark;
    }

    const store = getThemeStore();
    if (store) {
        const previousIsDark = store.isDark;
        store.isDark = normalizedIsDark;

        if (previousIsDark !== normalizedIsDark) {
            notifyThemeListeners(normalizedIsDark);
        }
    }

    return normalizedIsDark;
};

export const startSystemThemeSync = () => {
    const store = getThemeStore();
    if (!store) {
        return () => { };
    }

    if (store.started) {
        return store.removeSystemListener || (() => { });
    }

    const matcher = getThemeMatcher();
    const handleSystemThemeChange = (event) => {
        syncDocumentTheme(event.matches);
    };

    syncDocumentTheme(resolveSystemDarkPreference());

    if (matcher) {
        if (typeof matcher.addEventListener === 'function') {
            matcher.addEventListener('change', handleSystemThemeChange);
            store.removeSystemListener = () => matcher.removeEventListener('change', handleSystemThemeChange);
        } else if (typeof matcher.addListener === 'function') {
            matcher.addListener(handleSystemThemeChange);
            store.removeSystemListener = () => matcher.removeListener(handleSystemThemeChange);
        }
    }

    store.started = true;
    if (!store.removeSystemListener) {
        store.removeSystemListener = () => { };
    }

    return store.removeSystemListener;
};

export const isDarkThemeActive = () => {
    if (typeof document !== 'undefined') {
        return document.documentElement.classList.contains(ROOT_DARK_CLASS);
    }

    const store = getThemeStore();
    if (store && typeof store.isDark === 'boolean') {
        return store.isDark;
    }

    return resolveSystemDarkPreference();
};

export const subscribeToThemeChange = (listener, { emitCurrent = true } = {}) => {
    const store = getThemeStore();
    if (!store) {
        return () => { };
    }

    startSystemThemeSync();
    store.listeners.add(listener);

    if (emitCurrent) {
        listener(isDarkThemeActive());
    }

    return () => {
        store.listeners.delete(listener);
    };
};
