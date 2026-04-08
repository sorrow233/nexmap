import { useStore } from '../store/useStore';
import { getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
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
import { FIREBASE_SYNC_ENABLED } from './sync/config';
import { createUserSettingsRef } from './sync/firestoreSyncPaths';

const SETTINGS_SYNC_META_KEY = 'mixboard_settings_sync_meta_v1';
const SETTINGS_DOC_SCHEMA_VERSION = 1;

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

const readJsonStorageValue = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
};

const readSettingsSyncMeta = () => {
    const parsed = readJsonStorageValue(SETTINGS_SYNC_META_KEY, null);
    return {
        savedAt: Number(parsed?.savedAt) || 0,
        source: typeof parsed?.source === 'string' ? parsed.source : 'unknown'
    };
};

const writeSettingsSyncMeta = (savedAt, source = 'local') => {
    localStorage.setItem(SETTINGS_SYNC_META_KEY, JSON.stringify({
        savedAt: Number(savedAt) || Date.now(),
        source: typeof source === 'string' ? source : 'local'
    }));
};

const getLocalSettingsSavedAt = () => {
    const meta = readSettingsSyncMeta();
    if (meta.savedAt > 0) {
        return meta.savedAt;
    }

    const state = useStore.getState();
    const hasPersistedGlobalPrompts = Boolean(localStorage.getItem('mixboard_global_prompts'));
    const customInstructionsEntry = readTimestampedValue(CUSTOM_INSTRUCTIONS_KEY);

    return Math.max(
        Number(state.lastUpdated) || 0,
        hasPersistedGlobalPrompts ? (Number(state.globalPromptsModifiedAt) || 0) : 0,
        customInstructionsEntry.value ? (Number(customInstructionsEntry.lastModified) || 0) : 0
    );
};

const buildLocalSettingsSnapshot = (appUid = null) => {
    const state = useStore.getState();
    const { value: customInstructions, lastModified } = readTimestampedValue(CUSTOM_INSTRUCTIONS_KEY);
    const settingsSavedAt = getLocalSettingsSavedAt();

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
        userLanguage: localStorage.getItem('userLanguage') || '',
        settingsSavedAt
    };
};

const normalizeSettingsPayload = (settings = {}, appUid = null) => {
    const localSnapshot = buildLocalSettingsSnapshot(appUid);

    return {
        ...localSnapshot,
        ...settings,
        customInstructions: normalizeCustomInstructionsValue(
            Object.prototype.hasOwnProperty.call(settings, 'customInstructions')
                ? settings.customInstructions
                : localSnapshot.customInstructions
        ),
        globalPrompts: Array.isArray(settings.globalPrompts)
            ? settings.globalPrompts
            : localSnapshot.globalPrompts,
        settingsSavedAt: Number(settings.settingsSavedAt)
            || Number(localSnapshot.settingsSavedAt)
            || Date.now()
    };
};

const hasRemoteSettingsDocument = (data = {}) => (
    data
    && typeof data === 'object'
    && data.payload
    && typeof data.payload === 'object'
);

const applyLocalSettingsUpdate = (updates = {}, appUid = null, options = {}) => {
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
        state.setGlobalPrompts(updates.globalPrompts, {
            fromCloud: options.fromCloud === true,
            modifiedAt: Number(updates.globalPromptsModifiedAt) || 0
        });
    }

    if (typeof updates.userLanguage === 'string') {
        const normalizedLanguage = updates.userLanguage.trim();
        if (normalizedLanguage) {
            localStorage.setItem('userLanguage', normalizedLanguage);
        } else {
            localStorage.removeItem('userLanguage');
        }
    }

    const linkageSnapshot = buildLocalSettingsSnapshot(appUid);
    const nextLinkageSettings = normalizeLinkageSettings({
        ...linkageSnapshot,
        ...updates
    });
    persistLinkageSettingsLocal(nextLinkageSettings, appUid);

    if (Number(updates.settingsSavedAt) > 0) {
        writeSettingsSyncMeta(
            Number(updates.settingsSavedAt),
            options.fromCloud === true ? 'cloud' : (options.source || 'local')
        );
    }
};

const serializeRemoteSettingsDoc = (settings = {}, savedAt = Date.now()) => ({
    schemaVersion: SETTINGS_DOC_SCHEMA_VERSION,
    updatedAtMs: Number(savedAt) || Date.now(),
    updatedAt: serverTimestamp(),
    payload: {
        ...settings,
        settingsSavedAt: Number(savedAt) || Date.now()
    }
});

const resolveRemoteSettingsUpdate = (userId, remoteSnapshot, options = {}) => {
    if (!remoteSnapshot) {
        return {
            applied: false,
            reason: 'remote_missing',
            settings: null
        };
    }

    const localSavedAt = Number(getLocalSettingsSavedAt()) || 0;
    const remoteSavedAt = Number(remoteSnapshot.settingsSavedAt) || 0;
    const allowEqual = options.allowEqual === true;

    if (remoteSavedAt < localSavedAt) {
        return {
            applied: false,
            reason: 'remote_older',
            settings: remoteSnapshot
        };
    }

    if (!allowEqual && remoteSavedAt === localSavedAt) {
        return {
            applied: false,
            reason: 'same_timestamp',
            settings: remoteSnapshot
        };
    }

    applyLocalSettingsUpdate(remoteSnapshot, userId, {
        fromCloud: true,
        source: options.source || 'remote_sync'
    });

    return {
        applied: true,
        reason: remoteSavedAt === localSavedAt ? 'remote_equal_applied' : 'remote_newer_applied',
        settings: remoteSnapshot
    };
};
const readRemoteUserSettings = async (userId) => {
    if (!userId || !FIREBASE_SYNC_ENABLED) {
        return null;
    }

    const snapshot = await getDoc(createUserSettingsRef(userId));
    if (!snapshot.exists()) {
        return null;
    }

    const data = snapshot.data() || {};
    if (hasRemoteSettingsDocument(data)) {
        return {
            ...data.payload,
            settingsSavedAt: Number(data.payload.settingsSavedAt) || Number(data.updatedAtMs) || 0,
            updatedAtMs: Number(data.updatedAtMs) || 0
        };
    }

    return {
        ...data,
        settingsSavedAt: Number(data.settingsSavedAt) || Number(data.updatedAtMs) || 0,
        updatedAtMs: Number(data.updatedAtMs) || 0
    };
};

const writeRemoteUserSettings = async (userId, settings) => {
    const normalizedSettings = normalizeSettingsPayload(settings, userId);
    const savedAt = Number(normalizedSettings.settingsSavedAt) || Date.now();

    await setDoc(
        createUserSettingsRef(userId),
        serializeRemoteSettingsDoc(normalizedSettings, savedAt),
        { merge: true }
    );

    return {
        ...normalizedSettings,
        settingsSavedAt: savedAt
    };
};

export const saveUserSettings = async (userId, settings) => {
    const normalizedSettings = normalizeSettingsPayload(settings, userId);
    applyLocalSettingsUpdate(normalizedSettings, userId, {
        source: 'settings_modal'
    });

    if (!userId || !FIREBASE_SYNC_ENABLED) {
        return { ok: true, reason: 'local_only', settings: normalizedSettings };
    }

    try {
        const remoteSettings = await writeRemoteUserSettings(userId, normalizedSettings);
        return { ok: true, reason: 'firestore', settings: remoteSettings };
    } catch (error) {
        console.error('[UserSettings] Failed to sync settings to Firestore, kept local copy only:', error);
        return {
            ok: true,
            reason: 'local_only_remote_failed',
            settings: normalizedSettings,
            error
        };
    }
};

export const updateUserSettings = async (userId, updates) => {
    const mergedSettings = normalizeSettingsPayload(updates, userId);
    return saveUserSettings(userId, mergedSettings);
};

export const loadUserSettings = async (userId) => {
    if (!userId || !FIREBASE_SYNC_ENABLED) {
        return buildLocalSettingsSnapshot(userId);
    }

    try {
        return (await readRemoteUserSettings(userId)) || buildLocalSettingsSnapshot(userId);
    } catch (error) {
        console.error('[UserSettings] Failed to load remote settings, falling back to local snapshot:', error);
        return buildLocalSettingsSnapshot(userId);
    }
};

export const syncUserSettingsForSession = async (userId) => {
    const localSnapshot = normalizeSettingsPayload({}, userId);

    if (!userId || !FIREBASE_SYNC_ENABLED) {
        return {
            ok: true,
            reason: 'local_only',
            settings: localSnapshot
        };
    }

    let remoteSnapshot = null;
    try {
        remoteSnapshot = await readRemoteUserSettings(userId);
    } catch (error) {
        console.error('[UserSettings] Failed to fetch remote settings during session sync:', error);
        return {
            ok: false,
            reason: 'remote_read_failed',
            settings: localSnapshot,
            error
        };
    }

    const localSavedAt = Number(localSnapshot.settingsSavedAt) || 0;
    const remoteSavedAt = Number(remoteSnapshot?.settingsSavedAt) || 0;

    if (remoteSnapshot && remoteSavedAt > localSavedAt) {
        resolveRemoteSettingsUpdate(userId, remoteSnapshot, {
            allowEqual: true,
            source: 'session_sync'
        });
        return {
            ok: true,
            reason: 'pulled_remote',
            settings: remoteSnapshot
        };
    }

    if (!remoteSnapshot || localSavedAt > remoteSavedAt) {
        try {
            const pushedSnapshot = await writeRemoteUserSettings(userId, localSnapshot);
            return {
                ok: true,
                reason: remoteSnapshot ? 'pushed_local' : 'seeded_remote',
                settings: pushedSnapshot
            };
        } catch (error) {
            console.error('[UserSettings] Failed to push local settings during session sync:', error);
            return {
                ok: false,
                reason: 'remote_write_failed',
                settings: localSnapshot,
                error
            };
        }
    }

    const resolvedEqualSync = resolveRemoteSettingsUpdate(userId, remoteSnapshot, {
        allowEqual: true,
        source: 'session_sync'
    });
    return {
        ok: true,
        reason: resolvedEqualSync.reason || 'already_synced',
        settings: remoteSnapshot
    };
};

export const subscribeUserSettingsSync = (userId, callbacks = {}) => {
    if (!userId || !FIREBASE_SYNC_ENABLED) {
        return () => { };
    }

    return onSnapshot(
        createUserSettingsRef(userId),
        (snapshot) => {
            if (!snapshot.exists()) {
                callbacks.onUpdate?.({
                    applied: false,
                    reason: 'remote_missing',
                    settings: null
                });
                return;
            }

            const remoteSnapshot = hasRemoteSettingsDocument(snapshot.data())
                ? {
                    ...snapshot.data().payload,
                    settingsSavedAt: Number(snapshot.data().payload?.settingsSavedAt) || Number(snapshot.data().updatedAtMs) || 0,
                    updatedAtMs: Number(snapshot.data().updatedAtMs) || 0
                }
                : {
                    ...(snapshot.data() || {}),
                    settingsSavedAt: Number(snapshot.data()?.settingsSavedAt) || Number(snapshot.data()?.updatedAtMs) || 0,
                    updatedAtMs: Number(snapshot.data()?.updatedAtMs) || 0
                };

            const result = resolveRemoteSettingsUpdate(userId, remoteSnapshot, {
                allowEqual: false,
                source: 'live_sync'
            });
            callbacks.onUpdate?.(result);
        },
        (error) => {
            console.error('[UserSettings] Live sync subscription failed:', error);
            callbacks.onError?.(error);
        }
    );
};
