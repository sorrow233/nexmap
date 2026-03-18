import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { debugLog } from '../../utils/debugLogger';
import { db, handleSyncError, isOfflineMode } from './core';

const normalizeSettingsUpdates = (updates = {}) => {
    const processedUpdates = { ...updates };

    if (processedUpdates.customInstructionsModified === true) {
        delete processedUpdates.customInstructionsModified;
        processedUpdates.customInstructionsModifiedAt = serverTimestamp();
    }
    if (processedUpdates.globalPromptsModified === true) {
        delete processedUpdates.globalPromptsModified;
        processedUpdates.globalPromptsModifiedAt = serverTimestamp();
    }
    if (processedUpdates.userLanguageModified === true) {
        delete processedUpdates.userLanguageModified;
        processedUpdates.userLanguageModifiedAt = serverTimestamp();
    }
    if (processedUpdates.lastUpdated === undefined) {
        processedUpdates.lastUpdated = Date.now();
    }

    return processedUpdates;
};

export const saveUserSettings = async (userId, settings) => {
    if (!db || !userId) return { ok: false, reason: 'missing_context' };
    if (isOfflineMode()) {
        debugLog.sync('Skipped saveUserSettings because offline mode is enabled');
        return { ok: false, reason: 'offline_mode' };
    }

    try {
        debugLog.auth('Saving user settings to cloud...', settings);
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        await setDoc(configRef, settings);
        return { ok: true };
    } catch (error) {
        handleSyncError('Save settings failed', error);
        return { ok: false, reason: 'error', error };
    }
};

export const updateUserSettings = async (userId, updates) => {
    if (!db || !userId) return { ok: false, reason: 'missing_context' };
    if (isOfflineMode()) {
        debugLog.sync('Skipped updateUserSettings because offline mode is enabled');
        return { ok: false, reason: 'offline_mode' };
    }

    try {
        debugLog.auth('Updating user settings in cloud...', updates);
        const processedUpdates = normalizeSettingsUpdates(updates);
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        const docSnap = await getDoc(configRef);

        if (docSnap.exists()) {
            await updateDoc(configRef, processedUpdates);
        } else {
            await setDoc(configRef, processedUpdates);
        }

        return { ok: true };
    } catch (error) {
        handleSyncError('Update settings failed', error);
        return { ok: false, reason: 'error', error };
    }
};

export const loadUserSettings = async (userId) => {
    if (!db || !userId) return null;

    try {
        debugLog.auth('Loading user settings from cloud');
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        const docSnap = await getDoc(configRef);
        const data = docSnap.exists() ? docSnap.data() : null;
        debugLog.auth(data ? 'Settings loaded' : 'No cloud settings found');
        return data;
    } catch (error) {
        debugLog.error('Load settings failed', error);
        return null;
    }
};

export const listenForUserSettings = (userId, onUpdate) => {
    if (!db || !userId || typeof onUpdate !== 'function') return () => { };

    try {
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        return onSnapshot(configRef, (docSnap) => {
            const data = docSnap.exists() ? docSnap.data() : null;
            onUpdate(data);
        }, (error) => {
            handleSyncError('Firestore user settings listener error:', error);
        });
    } catch (error) {
        debugLog.error('listenForUserSettings error:', error);
        return () => { };
    }
};
