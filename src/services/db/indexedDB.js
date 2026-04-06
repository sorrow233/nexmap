const IDB_NAME = 'MixBoardDB';
const IDB_STORE = 'boards';
const IDB_BACKUP_STORE = 'scheduled_backups';
const IDB_VERSION = 2; // Upgraded for scheduled backups
const IS_VERBOSE_IDB_LOG = import.meta?.env?.MODE === 'development';

let dbPromise = null;

const initDB = () => {
    if (dbPromise) return dbPromise;
    
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_NAME, IDB_VERSION);
        request.onerror = (e) => {
            dbPromise = null; // Reset promise on error to allow retry
            reject(request.error);
        };
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
            // V2: Add scheduled backups store
            if (!db.objectStoreNames.contains(IDB_BACKUP_STORE)) {
                db.createObjectStore(IDB_BACKUP_STORE);
            }
        };
    });
    return dbPromise;
};

const withStore = async (storeName, mode, executor) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            executor({ transaction, store, resolve, reject });
        } catch (e) {
            // Handle cases where connection might be closed
            dbPromise = null;
            reject(e);
        }
    });
};

export const idbGetFromStore = async (storeName, key) => withStore(storeName, 'readonly', ({ store, resolve, reject }) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
        console.error(`[IDB] Get error for ${key} in ${storeName}:`, request.error);
        reject(request.error);
    };
});

export const idbSetInStore = async (storeName, key, value) => withStore(storeName, 'readwrite', ({ store, transaction, resolve, reject }) => {
    store.put(value, key);
    transaction.oncomplete = () => {
        resolve();
    };
    transaction.onerror = () => {
        console.error(`[IDB] Transaction error for ${key} in ${storeName}:`, transaction.error);
        reject(transaction.error);
    };
});

export const idbDelFromStore = async (storeName, key) => withStore(storeName, 'readwrite', ({ store, transaction, resolve, reject }) => {
    store.delete(key);
    transaction.oncomplete = () => {
        if (IS_VERBOSE_IDB_LOG) {
            console.log(`[IDB] Delete complete for ${key} in ${storeName}`);
        }
        resolve();
    };
    transaction.onerror = () => reject(transaction.error);
});

export const idbClearStore = async (storeName) => withStore(storeName, 'readwrite', ({ store, transaction, resolve, reject }) => {
    store.clear();
    transaction.oncomplete = () => {
        console.log(`[IDB] Store cleared: ${storeName}`);
        resolve();
    };
    transaction.onerror = () => reject(transaction.error);
});

export const idbGetEntriesByPrefixFromStore = async (storeName, prefix) => withStore(storeName, 'readonly', ({ store, resolve, reject }) => {
    const request = store.openCursor();
    const entries = [];

    request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
            resolve(entries);
            return;
        }

        const key = cursor.key;
        if (typeof key === 'string' && key.startsWith(prefix)) {
            entries.push({ key, value: cursor.value });
        }
        cursor.continue();
    };

    request.onerror = () => {
        console.error(`[IDB] Cursor error for prefix ${prefix} in ${storeName}:`, request.error);
        reject(request.error);
    };
});

export const idbGetKeysByPrefixFromStore = async (storeName, prefix) => withStore(storeName, 'readonly', ({ store, resolve, reject }) => {
    const request = store.openKeyCursor();
    const keys = [];

    request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
            resolve(keys);
            return;
        }

        const key = cursor.key;
        if (typeof key === 'string' && key.startsWith(prefix)) {
            keys.push(key);
        }
        cursor.continue();
    };

    request.onerror = () => {
        console.error(`[IDB] Key cursor error for prefix ${prefix} in ${storeName}:`, request.error);
        reject(request.error);
    };
});

export const idbGet = async (key) => {
    return idbGetFromStore(IDB_STORE, key);
};

export const idbSet = async (key, value) => {
    return idbSetInStore(IDB_STORE, key, value);
};

export const idbDel = async (key) => {
    return idbDelFromStore(IDB_STORE, key);
};

/**
 * Clear all board/image data from the primary IndexedDB store.
 * Backup store is intentionally preserved for local recovery.
 */
export const idbClear = async () => {
    return idbClearStore(IDB_STORE);
};

/**
 * Get all entries in the main store with keys matching the given prefix.
 * @param {string} prefix
 * @returns {Promise<Array<{ key: string, value: any }>>}
 */
export const idbGetEntriesByPrefix = async (prefix) => {
    return idbGetEntriesByPrefixFromStore(IDB_STORE, prefix);
};

export const IDB_STORE_NAMES = {
    BOARDS: IDB_STORE,
    BACKUPS: IDB_BACKUP_STORE
};
