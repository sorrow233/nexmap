import { auth } from './firebase';
import {
    createEmptyLinkageSettings,
    getLinkageTarget,
    LINKAGE_TARGET_LIST,
    normalizeLinkageSettings
} from './linkageTargets';

const resolveAppUid = (appUid) => {
    if (typeof appUid === 'string') return appUid;
    return auth?.currentUser?.uid || null;
};

const getScopedStorageKey = (target, appUid) => {
    if (!target || !appUid) return null;
    return `${target.localStorageScopedPrefix}${appUid}`;
};

export const getLocalLinkageUserId = (targetId, appUid) => {
    const target = getLinkageTarget(targetId);
    if (!target) return null;

    const resolvedAppUid = resolveAppUid(appUid);
    const scopedKey = getScopedStorageKey(target, resolvedAppUid);

    if (scopedKey) {
        const scopedValue = localStorage.getItem(scopedKey);
        if (scopedValue) {
            if (localStorage.getItem(target.localStorageKey) !== scopedValue) {
                localStorage.setItem(target.localStorageKey, scopedValue);
            }
            return scopedValue;
        }
    }

    const legacyValue = localStorage.getItem(target.localStorageKey);
    if (legacyValue && scopedKey) {
        localStorage.setItem(scopedKey, legacyValue);
    }
    return legacyValue;
};

export const persistLinkageUserIdLocal = (targetId, userId, appUid) => {
    const target = getLinkageTarget(targetId);
    if (!target) return;

    const normalized = typeof userId === 'string' ? userId.trim() : '';
    const resolvedAppUid = resolveAppUid(appUid);
    const scopedKey = getScopedStorageKey(target, resolvedAppUid);

    if (normalized) {
        localStorage.setItem(target.localStorageKey, normalized);
        if (scopedKey) {
            localStorage.setItem(scopedKey, normalized);
        }
        return;
    }

    localStorage.removeItem(target.localStorageKey);
    if (scopedKey) {
        localStorage.removeItem(scopedKey);
    }
};

export const getLocalLinkageSettings = (appUid) => {
    const next = createEmptyLinkageSettings();

    for (const target of LINKAGE_TARGET_LIST) {
        next[target.settingsKey] = getLocalLinkageUserId(target.id, appUid) || '';
    }

    return next;
};

export const persistLinkageSettingsLocal = (settings, appUid) => {
    const normalized = normalizeLinkageSettings(settings);

    for (const target of LINKAGE_TARGET_LIST) {
        persistLinkageUserIdLocal(target.id, normalized[target.settingsKey], appUid);
    }

    return normalized;
};
