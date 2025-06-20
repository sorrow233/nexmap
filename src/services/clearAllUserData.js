/**
 * Clear All User Data Service
 * 
 * Provides a centralized function to clear all user data on logout.
 * This ensures a clean state when switching between accounts.
 */

import { idbClear } from './db/indexedDB';
import { useStore, clearHistory } from '../store/useStore';
import { DEFAULT_PROVIDERS } from './llm/registry';

// All localStorage keys used by the app
const STORAGE_KEYS_TO_REMOVE = [
    'mixboard_providers_v3',
    'mixboard_boards_list',
    'mixboard_s3_config',
    'mixboard_current_board_id',
    'mixboard_favorites',
    'hasVisitedBefore',
    'hasUsedConnections'
];

// Prefixes for dynamically created keys
const STORAGE_PREFIXES = [
    'mixboard_viewport_',
    'mixboard_board_'
];

/**
 * Clear all user data from localStorage, IndexedDB, and Redux store.
 * Should be called before Firebase signOut.
 */
export async function clearAllUserData() {
    console.log('[Logout] Clearing all user data...');

    // 1. Clear static localStorage keys
    STORAGE_KEYS_TO_REMOVE.forEach(key => {
        localStorage.removeItem(key);
    });

    // 2. Clear dynamically created localStorage keys (viewport states, board data)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && STORAGE_PREFIXES.some(prefix => key.startsWith(prefix))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[Logout] Cleared ${STORAGE_KEYS_TO_REMOVE.length + keysToRemove.length} localStorage keys`);

    // 3. Clear IndexedDB (images, board data)
    try {
        await idbClear();
        console.log('[Logout] Cleared IndexedDB');
    } catch (e) {
        console.error('[Logout] Failed to clear IndexedDB:', e);
    }

    // 4. Reset Redux store state
    useStore.getState().resetAllState();

    // 5. Clear undo/redo history
    clearHistory();

    console.log('[Logout] All user data cleared successfully');
}
