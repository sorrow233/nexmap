import {
    IDB_STORE_NAMES,
    idbDelFromStore,
    idbGetFromStore,
    idbSetInStore
} from './indexedDB';

export const backupStoreGet = async (key) => idbGetFromStore(IDB_STORE_NAMES.BACKUPS, key);

export const backupStoreSet = async (key, value) => idbSetInStore(IDB_STORE_NAMES.BACKUPS, key, value);

export const backupStoreDel = async (key) => idbDelFromStore(IDB_STORE_NAMES.BACKUPS, key);
