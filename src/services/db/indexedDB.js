
const IDB_NAME = 'MixBoardDB';
const IDB_STORE = 'boards';
const IDB_BACKUP_STORE = 'scheduled_backups';
const IDB_VERSION = 2; // Upgraded for scheduled backups
const IS_VERBOSE_IDB_LOG = import.meta.env.MODE === 'development';

const initDB = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onerror = () => reject(request.error);
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

export const idbGet = async (key) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE, 'readonly');
        const store = transaction.objectStore(IDB_STORE);
        const request = store.get(key);
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            console.error(`[IDB] Get error for ${key}:`, request.error);
            reject(request.error);
        };
    });
};

export const idbSet = async (key, value) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE, 'readwrite');
        const store = transaction.objectStore(IDB_STORE);
        const request = store.put(value, key);

        transaction.oncomplete = () => {
            resolve();
        };

        transaction.onerror = () => {
            console.error(`[IDB] Transaction error for ${key}:`, transaction.error);
            reject(transaction.error);
        };
    });
};

export const idbDel = async (key) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE, 'readwrite');
        const store = transaction.objectStore(IDB_STORE);
        const request = store.delete(key);

        transaction.oncomplete = () => {
            if (IS_VERBOSE_IDB_LOG) {
                console.log(`[IDB] Delete complete for ${key}`);
            }
            resolve();
        };
        transaction.onerror = () => reject(transaction.error);
    });
};

/**
 * Clear all data from the IndexedDB store.
 * Used during logout to ensure clean state.
 */
export const idbClear = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE, 'readwrite');
        const store = transaction.objectStore(IDB_STORE);
        const request = store.clear();

        transaction.oncomplete = () => {
            console.log('[IDB] Store cleared');
            resolve();
        };
        transaction.onerror = () => reject(transaction.error);
    });
};

/**
 * Get all entries in the main store with keys matching the given prefix.
 * @param {string} prefix
 * @returns {Promise<Array<{ key: string, value: any }>>}
 */
export const idbGetEntriesByPrefix = async (prefix) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE, 'readonly');
        const store = transaction.objectStore(IDB_STORE);
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
            console.error(`[IDB] Cursor error for prefix ${prefix}:`, request.error);
            reject(request.error);
        };
    });
};
