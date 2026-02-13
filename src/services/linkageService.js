import { debugLog } from '../utils/debugLogger';
import { auth } from './firebase';
import { loadUserSettings, updateUserSettings } from './syncService';

/**
 * LinkageService
 * Handles cross-project data transmission via Background API Call
 */

// Target project API endpoint
export const TARGET_API_URL = 'https://flowstudio.catzz.work/api/import';

// localStorage key for FlowStudio user ID
const FLOWSTUDIO_USER_ID_KEY = 'flowstudio_user_id';
const FLOWSTUDIO_USER_ID_KEY_PREFIX = 'flowstudio_user_id:';

const getCurrentAppUserUid = () => auth?.currentUser?.uid || null;
const getScopedFlowStudioKey = (uid) => `${FLOWSTUDIO_USER_ID_KEY_PREFIX}${uid}`;

const cacheFlowStudioUserId = (userId) => {
    if (!userId) return;

    localStorage.setItem(FLOWSTUDIO_USER_ID_KEY, userId);

    const appUid = getCurrentAppUserUid();
    if (appUid) {
        localStorage.setItem(getScopedFlowStudioKey(appUid), userId);
    }
};

const readCachedFlowStudioUserId = () => {
    const appUid = getCurrentAppUserUid();
    if (appUid) {
        const scoped = localStorage.getItem(getScopedFlowStudioKey(appUid));
        if (scoped) {
            if (localStorage.getItem(FLOWSTUDIO_USER_ID_KEY) !== scoped) {
                localStorage.setItem(FLOWSTUDIO_USER_ID_KEY, scoped);
            }
            return scoped;
        }
    }

    const legacy = localStorage.getItem(FLOWSTUDIO_USER_ID_KEY);
    if (legacy && appUid) {
        localStorage.setItem(getScopedFlowStudioKey(appUid), legacy);
    }
    return legacy;
};

export const linkageService = {
    /**
     * Get configured FlowStudio user ID
     * @returns {string|null}
     */
    getFlowStudioUserId: () => {
        return readCachedFlowStudioUserId();
    },

    /**
     * Ensure FlowStudio UID is available.
     * Fallback to cloud settings when local cache is missing.
     * @returns {Promise<string|null>}
     */
    ensureFlowStudioUserId: async () => {
        const localUserId = readCachedFlowStudioUserId();
        if (localUserId) return localUserId;

        const appUid = getCurrentAppUserUid();
        if (!appUid) return null;

        try {
            const settings = await loadUserSettings(appUid);
            const cloudUserId = settings?.flowStudioUserId?.trim?.() || '';
            if (cloudUserId) {
                cacheFlowStudioUserId(cloudUserId);
                debugLog.sync('FlowStudio UID restored on-demand from cloud:', cloudUserId);
                return cloudUserId;
            }
        } catch (error) {
            debugLog.error('Failed to restore FlowStudio UID from cloud', error);
        }

        return null;
    },

    /**
     * Set FlowStudio user ID for queue-based import
     * Also syncs to cloud for cross-device access
     * @param {string} userId - FlowStudio Firebase UID
     */
    setFlowStudioUserId: async (userId) => {
        const normalizedUserId = userId?.trim?.() || '';
        if (!normalizedUserId) {
            return { ok: false, reason: 'empty_user_id' };
        }

        cacheFlowStudioUserId(normalizedUserId);

        // 同步到云端
        if (auth?.currentUser) {
            const result = await updateUserSettings(auth.currentUser.uid, {
                flowStudioUserId: normalizedUserId
            });
            if (!result?.ok) {
                debugLog.error('FlowStudio UID cloud sync failed:', result?.reason || 'unknown');
                return result;
            }
            debugLog.sync('FlowStudio UID synced to cloud:', normalizedUserId);
            return result;
        }
        return { ok: true, reason: 'local_only' };
    },

    /**
     * Send text to FlowStudio via background API call
     * Supports both queue mode (silent) and redirect mode (fallback)
     * @param {string} text - The content to transmit
     * @returns {Promise<{success: boolean, method?: string}>}
     */
    sendToExternalProject: async (text) => {
        if (!text) return { success: false };

        try {
            const userId = readCachedFlowStudioUserId();
            debugLog.ui('Sending to FlowStudio', { textLength: text.length, hasUserId: !!userId });

            const response = await fetch(TARGET_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    userId: userId || undefined,
                    source: 'nexmap',
                    timestamp: Date.now()
                })
            });

            if (response.ok) {
                const data = await response.json();
                debugLog.ui('FlowStudio response', data);

                // 只要提供了 userId，我们就不希望打开新窗口，视为静默完成
                if (userId) {
                    debugLog.ui('Silent mode: Content sent to FlowStudio queue');
                    return { success: true, method: 'queue' };
                }

                // 只有在没提供 userId 的备选模式下，才根据返回的 redirectUrl 打开页面
                if (data.redirectUrl) {
                    window.open(data.redirectUrl, '_blank');
                    return { success: true, method: 'redirect' };
                }

                return { success: true, method: 'unknown' };
            } else {
                console.error('[LinkageService] API returned error:', response.status);
                return { success: false };
            }
        } catch (error) {
            console.error('[LinkageService] Failed to send to project', error);
            return { success: false };
        }
    },

    /**
     * Parse incoming import request from URL (for receiving end)
     * @returns {string|null} - The imported text or null
     */
    getIncomingText: () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('import_text');
    },

    /**
     * Clean up import parameters from URL without refreshing
     */
    clearUrlParams: () => {
        const url = new URL(window.location);
        url.searchParams.delete('import_text');
        window.history.replaceState({}, '', url);
    }
};
