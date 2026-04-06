import {
    IDB_STORE_NAMES,
    idbDelFromStore,
    idbGetKeysByPrefixFromStore,
    idbGetFromStore,
    idbSetInStore
} from './indexedDB';

export const backupStoreGet = async (key) => idbGetFromStore(IDB_STORE_NAMES.BACKUPS, key);

export const backupStoreGetKeysByPrefix = async (prefix) => idbGetKeysByPrefixFromStore(IDB_STORE_NAMES.BACKUPS, prefix);

export const backupStoreSet = async (key, value) => idbSetInStore(IDB_STORE_NAMES.BACKUPS, key, value);

export const backupStoreDel = async (key) => idbDelFromStore(IDB_STORE_NAMES.BACKUPS, key);
