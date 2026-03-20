import { getLocalLinkageUserId, persistLinkageUserIdLocal } from './linkageLocalStore';
import { getLinkageTarget } from './linkageTargets';

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

const ensureTargetUserId = async (targetId) => {
    return getLocalLinkageUserId(targetId);
};

const setTargetUserId = async (targetId, userId) => {
    const target = getTargetOrThrow(targetId);
    const normalizedUserId = userId?.trim?.() || '';

    if (!normalizedUserId) {
        return { ok: false, reason: 'empty_user_id' };
    }

    persistLinkageUserIdLocal(target.id, normalizedUserId);
    return { ok: true, reason: 'local_saved' };
};

const sendToTarget = async (targetId, text) => {
    const target = getTargetOrThrow(targetId);
    const normalizedText = text?.trim?.() || '';

    if (!normalizedText) {
        return { success: false, reason: 'empty_text' };
    }

    try {
        const userId = getLocalLinkageUserId(targetId);
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
    getFlowStudioUserId: () => getLocalLinkageUserId('flowstudio'),
    ensureFlowStudioUserId: () => ensureTargetUserId('flowstudio'),
    setFlowStudioUserId: (userId) => setTargetUserId('flowstudio', userId),
    sendToExternalProject: (text) => sendToTarget('flowstudio', text),
    getIncomingText: () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('import_text');
    },
    clearUrlParams: () => {
        const url = new URL(window.location);
        url.searchParams.delete('import_text');
        window.history.replaceState({}, '', url);
    }
};
