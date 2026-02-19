import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { debugLog } from '../utils/debugLogger';

const OFFLINE_MODE_KEY = 'mixboard_offline_mode';
const OFFLINE_AUTO_KEY = 'mixboard_offline_auto';
const OFFLINE_TIME_KEY = 'mixboard_offline_time';
const OFFLINE_REASON_KEY = 'mixboard_offline_reason';

const NETWORK_ERROR_THROTTLE_MS = 15000;
const NETWORK_RECOVERY_DELAY_MS = 5000;

const NETWORK_CODE_HINTS = ['unavailable', 'network-request-failed', 'deadline-exceeded'];
const NETWORK_ERROR_HINTS = [
    'err_internet_disconnected',
    'err_network_changed',
    'err_name_not_resolved',
    'webchannelconnection',
    'transport errored',
    'failed to fetch',
    'dns',
    'disconnected'
];

let monitorInitialized = false;
let recoveryTimer = null;
let lastHandledNetworkErrorAt = 0;

const isAutoOfflineMode = () => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(OFFLINE_AUTO_KEY) === 'true';
};

const isManualOfflineMode = () => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(OFFLINE_MODE_KEY) === 'true' && localStorage.getItem(OFFLINE_AUTO_KEY) !== 'true';
};

const toErrorText = (error) => {
    if (!error) return '';
    if (typeof error === 'string') return error.toLowerCase();

    const parts = [];
    if (typeof error.code === 'string') parts.push(error.code);
    if (typeof error.message === 'string') parts.push(error.message);
    if (typeof error.statusText === 'string') parts.push(error.statusText);

    return parts.join(' ').toLowerCase();
};

const setAutoOfflineFlags = (reason = 'network') => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(OFFLINE_MODE_KEY, 'true');
    localStorage.setItem(OFFLINE_AUTO_KEY, 'true');
    localStorage.setItem(OFFLINE_TIME_KEY, String(Date.now()));
    localStorage.setItem(OFFLINE_REASON_KEY, reason);
};

const clearAutoOfflineFlags = () => {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(OFFLINE_MODE_KEY);
    localStorage.removeItem(OFFLINE_AUTO_KEY);
    localStorage.removeItem(OFFLINE_TIME_KEY);
    localStorage.removeItem(OFFLINE_REASON_KEY);
};

const updateStoreOfflineState = async (enabled) => {
    try {
        const { useStore } = await import('../store/useStore');
        if (enabled) {
            useStore.getState().triggerAutoOffline?.();
            return;
        }
        useStore.getState().setOfflineMode?.(false);
    } catch {
        // Ignore store sync failure; localStorage is source of truth.
    }
};

const disableFirestoreNetworkSafely = async (db) => {
    if (!db) return;
    try {
        await disableNetwork(db);
    } catch (error) {
        debugLog.warn('[SyncNetwork] disableNetwork failed', error);
    }
};

const enableFirestoreNetworkSafely = async (db) => {
    if (!db) return;
    try {
        await enableNetwork(db);
    } catch (error) {
        debugLog.warn('[SyncNetwork] enableNetwork failed', error);
    }
};

const recoverFirestoreNetwork = async (db, reason = 'recovery') => {
    if (isManualOfflineMode()) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    await enableFirestoreNetworkSafely(db);
    if (isAutoOfflineMode()) {
        clearAutoOfflineFlags();
        await updateStoreOfflineState(false);
        debugLog.sync(`[SyncNetwork] Recovered from auto-offline (${reason})`);
    }
};

const scheduleNetworkRecovery = (db) => {
    if (typeof window === 'undefined' || recoveryTimer) return;
    recoveryTimer = window.setTimeout(() => {
        recoveryTimer = null;
        void recoverFirestoreNetwork(db, 'scheduled');
    }, NETWORK_RECOVERY_DELAY_MS);
};

export const isLikelyNetworkError = (error) => {
    const text = toErrorText(error);
    if (!text) return false;

    if (NETWORK_CODE_HINTS.some(code => text.includes(code))) return true;
    return NETWORK_ERROR_HINTS.some(hint => text.includes(hint));
};

export const handleTransientNetworkError = async (db, error, context = 'sync') => {
    if (!isLikelyNetworkError(error)) return false;
    if (isManualOfflineMode()) return true;

    const now = Date.now();
    if (now - lastHandledNetworkErrorAt < NETWORK_ERROR_THROTTLE_MS) {
        scheduleNetworkRecovery(db);
        return true;
    }

    lastHandledNetworkErrorAt = now;
    setAutoOfflineFlags(context);
    await updateStoreOfflineState(true);
    await disableFirestoreNetworkSafely(db);
    debugLog.warn(`[SyncNetwork] Temporary network issue in ${context}, switched to auto-offline`);
    scheduleNetworkRecovery(db);
    return true;
};

export const setupFirestoreConnectivityMonitor = (db) => {
    if (monitorInitialized || typeof window === 'undefined' || !db) return;
    monitorInitialized = true;

    const handleOffline = () => {
        void handleTransientNetworkError(db, new Error('Browser offline event'), 'browser.offline');
    };

    const handleOnline = () => {
        void recoverFirestoreNetwork(db, 'browser.online');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (!navigator.onLine) {
        handleOffline();
    }
};
