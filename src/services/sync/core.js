import { db } from '../firebase';
import { debugLog } from '../../utils/debugLogger';
import {
    handleTransientNetworkError,
    isLikelyNetworkError,
    setupFirestoreConnectivityMonitor
} from '../syncNetworkGuard';

export { db };

setupFirestoreConnectivityMonitor(db);

const getSyncRuntime = () => {
    if (!globalThis.__mixboardSyncRuntime) {
        globalThis.__mixboardSyncRuntime = {
            consoleWrapped: false,
            originalConsoleError: console.error
        };
    }

    return globalThis.__mixboardSyncRuntime;
};

export const isRetryableSyncWriteError = (error) => {
    if (isLikelyNetworkError(error)) return true;
    const code = String(error?.code || '').toLowerCase();
    return (
        code.includes('unavailable') ||
        code.includes('deadline-exceeded') ||
        code.includes('aborted') ||
        code.includes('internal') ||
        code.includes('resource-exhausted')
    );
};

const syncRuntime = getSyncRuntime();
if (!syncRuntime.consoleWrapped) {
    const originalConsoleError = syncRuntime.originalConsoleError || console.error;
    console.error = (...args) => {
        originalConsoleError.apply(console, args);
        const message = args.map((value) => String(value)).join(' ');

        if (message.includes('resource-exhausted') || message.includes('Quota exceeded')) {
            const offlineMode = localStorage.getItem('mixboard_offline_mode');
            if (offlineMode !== 'true') {
                debugLog.sync('[GlobalErrorHandler] Detected quota error from Firebase, triggering offline mode');
                localStorage.setItem('mixboard_offline_mode', 'true');
                localStorage.setItem('mixboard_offline_auto', 'true');
                localStorage.setItem('mixboard_offline_time', Date.now().toString());
                import('../../store/useStore').then(({ useStore }) => {
                    useStore.getState().triggerAutoOffline?.();
                }).catch((error) => {
                    console.error('[Sync] Failed to trigger auto-offline store state after quota error', error);
                });
            }
        }

        if (isLikelyNetworkError(message)) {
            void handleTransientNetworkError(db, message, 'console.error');
        }
    };
    syncRuntime.consoleWrapped = true;
}

const handleQuotaError = async (error, context) => {
    if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota exceeded')) {
        console.error(`[Sync] Quota exhausted during ${context}. Switching to offline mode.`);
        localStorage.setItem('mixboard_offline_mode', 'true');
        localStorage.setItem('mixboard_offline_auto', 'true');
        localStorage.setItem('mixboard_offline_time', Date.now().toString());
        try {
            const { useStore } = await import('../../store/useStore');
            useStore.getState().triggerAutoOffline?.();
        } catch (importError) {
            console.error('[Sync] Failed to import store while handling quota error', importError);
        }
        return true;
    }
    return false;
};

export const handleSyncError = (context, error) => {
    void handleQuotaError(error, context);
    if (isLikelyNetworkError(error)) {
        void handleTransientNetworkError(db, error, context);
        debugLog.warn(`${context} (temporary network issue)`, error);
        return;
    }
    debugLog.error(context, error);
};

export const isOfflineMode = () => {
    if (localStorage.getItem('mixboard_offline_mode') === 'true') {
        const isAuto = localStorage.getItem('mixboard_offline_auto') === 'true';
        const offlineTime = parseInt(localStorage.getItem('mixboard_offline_time') || '0', 10);
        const elapsed = Date.now() - offlineTime;

        if (isAuto && elapsed > 5 * 60 * 1000) {
            debugLog.sync('Auto-offline expired (5 min), allowing sync retry...');
            return false;
        }
        return true;
    }
    return false;
};

export const onSyncSuccess = () => {
    if (localStorage.getItem('mixboard_offline_auto') === 'true') {
        debugLog.sync('Sync succeeded! Clearing auto-offline mode.');
        localStorage.removeItem('mixboard_offline_mode');
        localStorage.removeItem('mixboard_offline_auto');
        localStorage.removeItem('mixboard_offline_time');
        localStorage.removeItem('mixboard_offline_reason');
        import('../../store/useStore').then(({ useStore }) => {
            useStore.getState().setOfflineMode?.(false);
        }).catch((error) => {
            console.error('[Sync] Failed to clear offline mode in store after sync recovery', error);
        });
    }
};
