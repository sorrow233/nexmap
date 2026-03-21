const listeners = new Set();

export const emitPersistedBoardSyncSnapshot = (payload = {}) => {
    listeners.forEach((listener) => {
        try {
            listener(payload);
        } catch (error) {
            console.error('[LocalPersistedBoardSyncBridge] Listener failed:', error);
        }
    });
};

export const subscribePersistedBoardSyncSnapshot = (listener) => {
    if (typeof listener !== 'function') {
        return () => { };
    }

    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
