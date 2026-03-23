const listeners = new Set();
const durableSaveListeners = new Set();

export const emitLocalSaveConfirmed = (payload = {}) => {
    listeners.forEach((listener) => {
        try {
            listener(payload);
        } catch (error) {
            console.error('[LocalPersistedBoardSyncBridge] Listener failed:', error);
        }
    });
};

export const subscribeLocalSaveConfirmed = (listener) => {
    if (typeof listener !== 'function') {
        return () => { };
    }

    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const emitDurableLocalSaveWritten = (payload = {}) => {
    durableSaveListeners.forEach((listener) => {
        try {
            listener(payload);
        } catch (error) {
            console.error('[LocalPersistedBoardSyncBridge] Durable save listener failed:', error);
        }
    });
};

export const subscribeDurableLocalSaveWritten = (listener) => {
    if (typeof listener !== 'function') {
        return () => { };
    }

    durableSaveListeners.add(listener);
    return () => {
        durableSaveListeners.delete(listener);
    };
};

// Backward-compatible aliases for existing imports during incremental refactors.
export const emitPersistedBoardSyncSnapshot = emitLocalSaveConfirmed;
export const subscribePersistedBoardSyncSnapshot = subscribeLocalSaveConfirmed;
