import { debugLog } from '../utils/debugLogger';
import { auth } from './firebase';
import { getLocalLinkageUserId, persistLinkageUserIdLocal } from './linkageLocalStore';
import { getLinkageTarget } from './linkageTargets';
import { loadUserSettings, updateUserSettings } from './syncService';

const parseJsonSafe = async (response) => {
    try {
        return await response.json();
    } catch (error) {
        console.error('[LinkageService] Failed to parse linkage response JSON', error);
        return {};
    }
};

const getTargetOrThrow = (targetId) => {
    const target = getLinkageTarget(targetId);
    if (!target) {
        throw new Error(`unknown_linkage_target:${targetId}`);
    }
    return target;
};

const getCurrentAppUserUid = () => auth?.currentUser?.uid || null;

const ensureTargetUserId = async (targetId) => {
    const target = getTargetOrThrow(targetId);
    const localUserId = getLocalLinkageUserId(targetId);
    if (localUserId) return localUserId;

    const appUid = getCurrentAppUserUid();
    if (!appUid) return null;

    try {
        const settings = await loadUserSettings(appUid);
        const cloudUserId = settings?.[target.cloudSettingsKey]?.trim?.() || '';

        if (cloudUserId) {
            persistLinkageUserIdLocal(targetId, cloudUserId, appUid);
            debugLog.sync(`${target.label} UID restored on-demand from cloud:`, cloudUserId);
            return cloudUserId;
        }
    } catch (error) {
        debugLog.error(`Failed to restore ${target.label} UID from cloud`, error);
    }

    return null;
};

const setTargetUserId = async (targetId, userId) => {
    const target = getTargetOrThrow(targetId);
    const normalizedUserId = userId?.trim?.() || '';

    if (!normalizedUserId) {
        return { ok: false, reason: 'empty_user_id' };
    }

    persistLinkageUserIdLocal(targetId, normalizedUserId);

    if (auth?.currentUser) {
        const result = await updateUserSettings(auth.currentUser.uid, {
            [target.cloudSettingsKey]: normalizedUserId
        });

        if (!result?.ok) {
            debugLog.error(`${target.label} UID cloud sync failed:`, result?.reason || 'unknown');
            return result;
        }

        debugLog.sync(`${target.label} UID synced to cloud:`, normalizedUserId);
        return result;
    }

    return { ok: true, reason: 'local_only' };
};

const sendToTarget = async (targetId, text) => {
    const target = getTargetOrThrow(targetId);
    const normalizedText = text?.trim?.() || '';

    if (!normalizedText) {
        return { success: false, reason: 'empty_text' };
    }

    try {
        const userId = getLocalLinkageUserId(targetId);
        debugLog.ui(`Sending to ${target.label}`, {
            textLength: normalizedText.length,
            hasUserId: !!userId
        });

        const response = await fetch(target.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: normalizedText,
                userId: userId || undefined,
                source: target.source,
                timestamp: Date.now()
            })
        });

        if (!response.ok) {
            console.error(`[LinkageService] ${target.label} API returned error:`, response.status);
            return { success: false, reason: `http_${response.status}` };
        }

        const data = await parseJsonSafe(response);
        debugLog.ui(`${target.label} response`, data);

        // Respect the server result first. Queue write failures may intentionally fall back to redirect.
        if (data.method === 'redirect' && data.redirectUrl) {
            window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
            return { success: true, method: 'redirect' };
        }

        if (data.method === 'queue') {
            return { success: true, method: 'queue' };
        }

        if (userId) {
            return { success: true, method: 'queue' };
        }

        if (data.redirectUrl) {
            window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
            return { success: true, method: 'redirect' };
        }

        return { success: true, method: 'unknown' };
    } catch (error) {
        console.error(`[LinkageService] Failed to send to ${target.label}`, error);
        return { success: false, reason: error?.message || 'request_failed' };
    }
};

export const linkageService = {
    getTargetUserId: (targetId) => getLocalLinkageUserId(targetId),
    ensureTargetUserId,
    setTargetUserId,
    sendToTarget,

    // Backward-compatible Flow helpers for existing call sites.
    getFlowStudioUserId: () => getLocalLinkageUserId('flowstudio'),
    ensureFlowStudioUserId: () => ensureTargetUserId('flowstudio'),
    setFlowStudioUserId: (userId) => setTargetUserId('flowstudio', userId),
    sendToExternalProject: (text) => sendToTarget('flowstudio', text),

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
