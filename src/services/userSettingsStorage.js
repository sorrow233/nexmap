import { useStore } from '../store/useStore';
import { getS3Config, saveS3Config } from './s3';
import {
    CUSTOM_INSTRUCTIONS_KEY,
    normalizeCustomInstructionsValue
} from './customInstructionsService';
import {
    getLocalLinkageSettings,
    persistLinkageSettingsLocal
} from './linkageLocalStore';
import { normalizeLinkageSettings } from './linkageTargets';

const readTimestampedValue = (key) => {
    const raw = localStorage.getItem(key);
    if (!raw) {
        return {
            value: null,
            lastModified: 0
        };
    }

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Object.prototype.hasOwnProperty.call(parsed, 'value')) {
            return {
                value: parsed.value,
                lastModified: Number(parsed.lastModified) || 0
            };
        }

        return {
            value: parsed,
            lastModified: 0
        };
    } catch {
        return {
            value: raw,
            lastModified: 0
        };
    }
};

const writeTimestampedValue = (key, value, lastModified = Date.now()) => {
    localStorage.setItem(key, JSON.stringify({
        value,
        lastModified
    }));
};

const buildLocalSettingsSnapshot = (appUid = null) => {
    const state = useStore.getState();
    const { value: customInstructions, lastModified } = readTimestampedValue(CUSTOM_INSTRUCTIONS_KEY);

    return {
        providers: state.providers,
        activeId: state.activeId,
        globalRoles: state.globalRoles,
        lastUpdated: state.lastUpdated || 0,
        s3Config: getS3Config() || null,
        customInstructions: normalizeCustomInstructionsValue(customInstructions),
        customInstructionsModifiedAt: lastModified,
        globalPrompts: state.globalPrompts || [],
        globalPromptsModifiedAt: state.globalPromptsModifiedAt || 0,
        ...getLocalLinkageSettings(appUid),
        userLanguage: localStorage.getItem('userLanguage') || ''
    };
};

const applyLocalSettingsUpdate = (updates = {}, appUid = null) => {
    const state = useStore.getState();
    const hasConfigUpdate =
        Object.prototype.hasOwnProperty.call(updates, 'providers') ||
        Object.prototype.hasOwnProperty.call(updates, 'activeId') ||
        Object.prototype.hasOwnProperty.call(updates, 'globalRoles') ||
        Object.prototype.hasOwnProperty.call(updates, 'lastUpdated');

    if (hasConfigUpdate) {
        state.setFullConfig({
            providers: updates.providers ?? state.providers,
            activeId: updates.activeId ?? state.activeId,
            globalRoles: updates.globalRoles ?? state.globalRoles,
            lastUpdated: updates.lastUpdated ?? Date.now()
        });
    }

    if (Object.prototype.hasOwnProperty.call(updates, 's3Config')) {
        saveS3Config(updates.s3Config);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'customInstructions')) {
        writeTimestampedValue(
            CUSTOM_INSTRUCTIONS_KEY,
            normalizeCustomInstructionsValue(updates.customInstructions),
            Number(updates.customInstructionsModifiedAt) || Date.now()
        );
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'globalPrompts') && Array.isArray(updates.globalPrompts)) {
        state.setGlobalPrompts(updates.globalPrompts);
    }

    if (typeof updates.userLanguage === 'string' && updates.userLanguage.trim()) {
        localStorage.setItem('userLanguage', updates.userLanguage.trim());
    }

    const linkageSnapshot = buildLocalSettingsSnapshot(appUid);
    const nextLinkageSettings = normalizeLinkageSettings({
        ...linkageSnapshot,
        ...updates
    });
    persistLinkageSettingsLocal(nextLinkageSettings, appUid);
};

export const saveUserSettings = async (userId, settings) => {
    applyLocalSettingsUpdate(settings, userId);
    return { ok: true, reason: 'local_only' };
};

export const updateUserSettings = async (userId, updates) => {
    applyLocalSettingsUpdate(updates, userId);
    return { ok: true, reason: 'local_only' };
};

export const loadUserSettings = async (userId) => {
    return buildLocalSettingsSnapshot(userId);
};
