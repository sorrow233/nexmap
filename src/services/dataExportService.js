/**
 * Data Export/Import Service
 * 
 * Provides functionality to export and import all user data
 * for backup and migration purposes.
 */

import { idbGet, idbSet } from './db/indexedDB';

// localStorage keys to export
const EXPORT_KEYS = [
    'mixboard_providers_v3',
    'mixboard_boards_list',
    'mixboard_s3_config',
    'mixboard_current_board_id',
    'mixboard_favorites_index',
    'mixboard_global_prompts',
    'mixboard_custom_instructions',
    'mixboard_settings',
    'userLanguage'
];

// Prefixes for dynamic keys
const DYNAMIC_PREFIXES = [
    'mixboard_viewport_'
];

/**
 * Get all localStorage keys that match our patterns
 */
const getAllStorageKeys = () => {
    const keys = [...EXPORT_KEYS];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && DYNAMIC_PREFIXES.some(prefix => key.startsWith(prefix))) {
            if (!keys.includes(key)) {
                keys.push(key);
            }
        }
    }

    return keys;
};

/**
 * Export all user data to a JSON object
 * @returns {Promise<object>} Complete user data export
 */
export async function exportAllData() {
    const exportData = {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        localStorage: {},
        boards: []
    };

    // 1. Export localStorage data
    const keys = getAllStorageKeys();
    for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value !== null) {
            try {
                // Try to parse as JSON for cleaner export
                exportData.localStorage[key] = JSON.parse(value);
            } catch {
                exportData.localStorage[key] = value;
            }
        }
    }

    // 2. Export IndexedDB board data
    const boardsList = localStorage.getItem('mixboard_boards_list');
    if (boardsList) {
        try {
            const boards = JSON.parse(boardsList);
            for (const boardMeta of boards) {
                const boardData = await idbGet(`mixboard_board_${boardMeta.id}`);
                if (boardData) {
                    exportData.boards.push({
                        id: boardMeta.id,
                        meta: boardMeta,
                        data: boardData
                    });
                }
            }
        } catch (e) {
            console.error('[Export] Failed to export boards:', e);
        }
    }

    return exportData;
}

/**
 * Generate a semantic filename for the backup
 */
export function generateBackupFilename() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `Mixboard_Backup_${dateStr}_${timeStr}.json`;
}

/**
 * Download data as a JSON file
 * @param {object} data - Data to download
 * @param {string} filename - Optional filename
 */
export function downloadDataAsFile(data, filename = null) {
    const finalFilename = filename || generateBackupFilename();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Get statistics/preview of a backup object without importing it
 * @param {object} data 
 */
export function getBackupStats(data) {
    if (!data || typeof data !== 'object') return null;

    return {
        version: data.version || 'Unknown',
        timestamp: data.exportedAt ? new Date(data.exportedAt).toLocaleString() : 'Unknown',
        boardCount: Array.isArray(data.boards) ? data.boards.length : 0,
        settingsCount: data.localStorage ? Object.keys(data.localStorage).length : 0,
        hasSettings: data.localStorage && !!data.localStorage['mixboard_settings'],
        hasSecrets: data.localStorage && (
            !!data.localStorage['mixboard_providers_v3'] ||
            !!data.localStorage['mixboard_s3_config']
        ),
        sizeBytes: new Blob([JSON.stringify(data)]).size
    };
}

/**
 * Validate import data format
 * @param {object} data - Data to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateImportData(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid data format' };
    }

    if (!data.version) {
        return { valid: false, error: 'Missing version field' };
    }

    if (!data.localStorage || typeof data.localStorage !== 'object') {
        return { valid: false, error: 'Missing localStorage data' };
    }

    return { valid: true };
}

/**
 * Import user data from a JSON object
 * @param {object} data - Data to import
 * @param {object} options - Import options
 * @param {boolean} options.importSettings - Whether to import settings/keys (default: false)
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function importData(data, options = { importSettings: false }) {
    // Validate data first
    const validation = validateImportData(data);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    try {
        let restoredSettingsCount = 0;

        // 1. Import localStorage data
        if (data.localStorage) {
            // Keys related to system configuration/secrets
            const CONFIG_KEYS = [
                'mixboard_providers_v3',
                'mixboard_s3_config',
                'mixboard_settings',
                'mixboard_custom_instructions'
            ];

            for (const [key, value] of Object.entries(data.localStorage)) {
                // If this is a config key and user chose NOT to import settings, skip it
                if (!options.importSettings && CONFIG_KEYS.includes(key)) {
                    continue;
                }

                const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                localStorage.setItem(key, stringValue);
                restoredSettingsCount++;
            }
        }

        console.log(`[Import] Restored ${restoredSettingsCount} localStorage entries`);

        // 2. Import board data to IndexedDB
        let boardCount = 0;
        if (data.boards && Array.isArray(data.boards)) {
            for (const board of data.boards) {
                if (board.id && board.data) {
                    await idbSet(`mixboard_board_${board.id}`, board.data);
                    boardCount++;
                }
            }
            console.log(`[Import] Restored ${boardCount} boards to IndexedDB`);
        }

        return {
            success: true,
            message: `Imported ${boardCount} boards and ${restoredSettingsCount} settings.`
        };
    } catch (e) {
        console.error('[Import] Failed:', e);
        return { success: false, error: e.message };
    }
}

/**
 * Read a JSON file and return parsed data
 * @param {File} file - File to read
 * @returns {Promise<object>}
 */
export function readJsonFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                resolve(data);
            } catch (err) {
                reject(new Error('Invalid JSON format'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
