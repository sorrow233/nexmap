import { useState, useEffect, useRef } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    loadBoardsMetadata,
    listenForBoardsMetadata,
    loadBoard,
    loadUserSettings,
    createBoard,
    saveBoard,
    cleanupExpiredTrash,
    getBoardsList,
    saveBoardToCloud
} from '../services/storage';
import { getRawBoardsList } from '../services/boardService'; // Fix: Import directly to resolve ReferenceError
import { listenForFavoriteUpdates, saveFavoriteToCloud as saveFavoritesToCloud, updateUserSettings, listenForUserSettings } from '../services/syncService';
import favoritesService from '../services/favoritesService';
import { initScheduledBackup } from '../services/scheduledBackupService';
import { useStore } from '../store/useStore';
import { ONBOARDING_DATA } from '../utils/onboarding';
import { getSampleBoardsList, getSampleBoardData } from '../utils/sampleBoardsData';
import { useLocation } from 'react-router-dom';
import { debugLog } from '../utils/debugLogger';
import { userStatsService } from '../services/stats/userStatsService';
import {
    CUSTOM_INSTRUCTIONS_KEY,
    normalizeCustomInstructionsValue,
    hasAnyCustomInstruction
} from '../services/customInstructionsService';

// --- Timestamp-aware localStorage utilities for smart sync ---
const loadWithTimestamp = (key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return { value: '', lastModified: 0 };
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
            return { value: parsed.value, lastModified: parsed.lastModified || 0 };
        }
        return { value: raw, lastModified: 0 };
    } catch {
        return { value: raw, lastModified: 0 };
    }
};

const saveWithTimestamp = (key, value) => {
    localStorage.setItem(key, JSON.stringify({
        value,
        lastModified: Date.now()
    }));
};

const normalizeUpdatedAt = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value && typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value === 'string') {
        const asNum = Number(value);
        if (Number.isFinite(asNum)) return asNum;
        const asDate = Date.parse(value);
        if (Number.isFinite(asDate)) return asDate;
    }
    return 0;
};

const hasAnyApiKey = (providers) => {
    if (!providers || typeof providers !== 'object') return false;
    return Object.values(providers).some(p => {
        const key = p?.apiKey;
        return typeof key === 'string' && key.trim().length > 0;
    });
};

const TRASH_CLEANUP_LAST_KEY = 'mixboard_last_trash_cleanup_at';
const TRASH_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function useAppInit() {
    const [user, setUser] = useState(null);
    const [boardsList, setBoardsList] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const { setCards, setConnections, setGroups, setBoardPrompts } = useStore();
    const location = useLocation();

    // Track if user was ever logged in this session - used to distinguish
    // "guest user" (never logged in) from "logged out user" (was logged in, then out)
    const wasEverLoggedIn = useRef(false);

    // Load initial boards metadata
    useEffect(() => {
        const init = async () => {
            debugLog.auth('Initializing app state...');

            // Cleanup expired trash at most once per day (non-blocking).
            try {
                const now = Date.now();
                const lastCleanupRaw = localStorage.getItem(TRASH_CLEANUP_LAST_KEY);
                const lastCleanup = Number(lastCleanupRaw || 0);
                const shouldRunCleanup = !Number.isFinite(lastCleanup) || now - lastCleanup >= TRASH_CLEANUP_INTERVAL_MS;
                if (shouldRunCleanup) {
                    debugLog.storage('Running scheduled trash cleanup...');
                    cleanupExpiredTrash()
                        .then(() => {
                            localStorage.setItem(TRASH_CLEANUP_LAST_KEY, String(Date.now()));
                        })
                        .catch((err) => {
                            debugLog.error('Scheduled trash cleanup failed', err);
                        });
                } else {
                    debugLog.storage('Skipping trash cleanup (recently cleaned).');
                }
            } catch (cleanupErr) {
                debugLog.error('Failed to schedule trash cleanup', cleanupErr);
            }

            // Initialize scheduled backup system
            initScheduledBackup();

            const list = loadBoardsMetadata();

            // Onboarding check - Show sample boards for new users
            // Fixed: Removed location.pathname check - users land on /gallery, not /
            if (list.length === 0) {
                debugLog.auth('No boards found, loading sample boards for new user...');
                const sampleBoards = getSampleBoardsList();

                // 1. Immediate UI Update (Synchronous)
                setBoardsList(sampleBoards);

                // 2. Persist in background (Fire & Forget)
                const persistedBoards = [];
                for (const sample of sampleBoards) {
                    const fullData = getSampleBoardData(sample.id);
                    // We must wait for this to ensure data is there if they click immediately, 
                    // but we already updated state so UI is happy.
                    await saveBoard(sample.id, fullData);
                    persistedBoards.push(sample);
                }
                localStorage.setItem('mixboard_boards_list', JSON.stringify(persistedBoards));
                debugLog.auth(`Loaded & Persisted ${persistedBoards.length} sample boards for onboarding`);
            } else {
                debugLog.storage(`Loaded metadata for ${list.length} boards`);
                setBoardsList(list);
            }

            setIsInitialized(true);
        };
        init();
    }, []); // Only run once on mount

    // Auth & Cloud Sync
    useEffect(() => {
        if (!auth) return;
        let unsubDb = null;

        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            debugLog.auth(u ? `User logged in: ${u.email}` : 'User logged out');

            if (unsubDb) {
                debugLog.sync('Cleaning up previous cloud listener');
                unsubDb();
                unsubDb = null;
            }

            if (u) {
                // Mark that user has logged in this session
                wasEverLoggedIn.current = true;

                // MIGRATION: Check for local boards that need to be synced to this new user
                // This handles the "Guest -> Logged In" flow where data would otherwise be lost
                // OPTIMIZATION: Only migrate once per user to avoid quota exhaustion
                const migrationKey = `mixboard_migrated_${u.uid}`;
                const hasMigrated = localStorage.getItem(migrationKey) === 'true';

                if (!hasMigrated) {
                    const migrateLocalData = async () => {
                        const localBoards = getBoardsList();
                        // CRITICAL FIX: Skip sample boards to prevent polluting old user's cloud data
                        // When old users login on new device, sample boards are temporarily loaded
                        // We should NOT upload these to cloud - only real user-created boards
                        const realBoards = localBoards.filter(b => !b.id.startsWith('sample-'));

                        if (realBoards.length > 0) {
                            debugLog.sync(`Found ${realBoards.length} real local boards. Migrating to cloud (first login)...`);

                            let migratedCount = 0;
                            for (const board of realBoards) {
                                try {
                                    const fullBoardData = await loadBoard(board.id);
                                    if (fullBoardData) {
                                        await saveBoardToCloud(u.uid, board.id, fullBoardData);
                                        migratedCount++;
                                    }
                                } catch (err) {
                                    debugLog.error(`Failed to migrate board ${board.id}`, err);
                                }
                            }

                            if (migratedCount > 0) {
                                debugLog.sync(`Successfully migrated ${migratedCount} local boards to cloud account.`);
                            }
                        } else {
                            debugLog.sync('No real local boards to migrate (only sample boards found, skipping).');
                        }

                        // Migrate Favorites (only on first login)
                        const localFavorites = favoritesService.getFavorites();
                        if (localFavorites.length > 0) {
                            debugLog.sync(`Found ${localFavorites.length} local favorites. Migrating to cloud...`);
                            // Batch with small delay to avoid hammering
                            for (let i = 0; i < localFavorites.length; i++) {
                                await saveFavoritesToCloud(u.uid, localFavorites[i]);
                                if (i > 0 && i % 5 === 0) {
                                    await new Promise(r => setTimeout(r, 100)); // Small pause every 5
                                }
                            }
                        }

                        // Mark as migrated
                        localStorage.setItem(migrationKey, 'true');
                        debugLog.sync('Migration complete, marked as migrated.');
                    };

                    migrateLocalData();
                } else {
                    debugLog.sync('Already migrated to cloud, skipping migration.');
                }

                // NEW: 使用分离式监听器，只监听元数据列表变化（不触发内容 rehydration）
                // 单画板内容同步由各自的 Canvas 页面通过 listenForSingleBoard 处理
                debugLog.sync('Starting cloud board METADATA sync (分离式同步)...');
                unsubDb = listenForBoardsMetadata(u.uid, (cloudBoards) => {
                    debugLog.sync(`[Metadata] Received update: ${cloudBoards.length} boards`);

                    // 只更新画板列表元数据，不触发内容同步
                    const localStorageBoards = getRawBoardsList();

                    setBoardsList(prev => {
                        const merged = cloudBoards.map(cloudBoard => {
                            const localStateBoard = prev.find(b => b.id === cloudBoard.id);
                            const localStorageBoard = localStorageBoards.find(b => b.id === cloudBoard.id);
                            const existingSummary = cloudBoard.summary ||
                                localStateBoard?.summary ||
                                localStorageBoard?.summary;

                            return {
                                ...cloudBoard,
                                summary: existingSummary
                            };
                        });
                        return merged;
                    });
                    // NOTE: 不再在这里触发活跃画板的 rehydration
                    // 每个标签页只监听自己的画板（在 Canvas 组件中使用 listenForSingleBoard）
                });

                // Listen for favorites
                const unsubFav = listenForFavoriteUpdates(u.uid, (updates) => {
                    favoritesService.updateLocalFavorites(updates);
                });

                const applyCloudProviderSettings = (settings, source = 'initial_load') => {
                    if (!settings?.providers) return;
                    const cloudUpdated = normalizeUpdatedAt(settings.lastUpdated);
                    const localState = useStore.getState();
                    const localUpdated = normalizeUpdatedAt(localState.lastUpdated);
                    const cloudHasKey = hasAnyApiKey(settings.providers);
                    const localHasKey = hasAnyApiKey(localState.providers);
                    const providersChanged = JSON.stringify(settings.providers) !== JSON.stringify(localState.providers);
                    const shouldApplyCloud = cloudUpdated > localUpdated ||
                        (!localHasKey && cloudHasKey) ||
                        (source === 'realtime' && providersChanged);

                    if (shouldApplyCloud) {
                        debugLog.auth(`[SettingsSync:${source}] Applying cloud settings (cloudUpdated=${cloudUpdated}, localUpdated=${localUpdated}, cloudHasKey=${cloudHasKey}, localHasKey=${localHasKey}, providersChanged=${providersChanged})`);
                        useStore.getState().setFullConfig({
                            providers: settings.providers,
                            activeId: settings.activeId || 'google',
                            globalRoles: settings.globalRoles || localState.globalRoles,
                            lastUpdated: cloudUpdated || Date.now()
                        });
                    } else {
                        debugLog.auth(`[SettingsSync:${source}] Ignored cloud settings (cloudUpdated=${cloudUpdated}, localUpdated=${localUpdated}, providersChanged=${providersChanged})`);
                    }
                };

                const unsubSettings = listenForUserSettings(u.uid, (settings) => {
                    if (!settings) return;
                    applyCloudProviderSettings(settings, 'realtime');
                });

                // Chain unsubscribe
                const originalUnsubDb = unsubDb;
                unsubDb = () => {
                    originalUnsubDb();
                    unsubFav();
                    unsubSettings();
                };

                // Load user stats from cloud
                debugLog.auth('Loading user stats from cloud...');
                userStatsService.loadFromCloud().then(loaded => {
                    if (loaded) {
                        debugLog.auth('User stats merged from cloud');
                    }
                });

                debugLog.auth('Loading user settings from cloud...');
                loadUserSettings(u.uid).then(async (settings) => {
                    if (settings) {
                        debugLog.auth('Cloud settings loaded successfully');
                        applyCloudProviderSettings(settings, 'initial_load');
                        if (settings.s3Config) {
                            localStorage.setItem('mixboard_s3_config', JSON.stringify(settings.s3Config));
                        }

                        // --- Smart Sync: Compare timestamps for customInstructions ---
                        const localData = loadWithTimestamp(CUSTOM_INSTRUCTIONS_KEY);
                        const localInstructions = normalizeCustomInstructionsValue(localData.value);
                        const cloudInstructions = normalizeCustomInstructionsValue(settings.customInstructions);
                        const cloudModified = settings.customInstructionsModifiedAt?.toMillis?.() || 0;

                        if (cloudModified > localData.lastModified) {
                            // Cloud is newer, use cloud value
                            debugLog.sync(`Cloud customInstructions is newer (${cloudModified} > ${localData.lastModified}), using cloud`);
                            saveWithTimestamp(CUSTOM_INSTRUCTIONS_KEY, cloudInstructions);
                        } else if (localData.lastModified > cloudModified && hasAnyCustomInstruction(localInstructions)) {
                            // Local is newer, sync to cloud
                            debugLog.sync(`Local customInstructions is newer (${localData.lastModified} > ${cloudModified}), syncing to cloud`);
                            updateUserSettings(u.uid, {
                                customInstructions: localInstructions,
                                customInstructionsModified: true
                            });
                        } else if (!cloudModified && !localData.lastModified) {
                            // Neither has timestamp (legacy), fall back to content-based merge
                            const cloudHasInstructions = hasAnyCustomInstruction(cloudInstructions);
                            const localHasInstructions = hasAnyCustomInstruction(localInstructions);
                            const sameInstructions = JSON.stringify(cloudInstructions) === JSON.stringify(localInstructions);

                            if (cloudHasInstructions && !sameInstructions) {
                                saveWithTimestamp(CUSTOM_INSTRUCTIONS_KEY, cloudInstructions);
                            } else if (localHasInstructions && !cloudHasInstructions) {
                                // Local has data, cloud is empty - sync local to cloud
                                updateUserSettings(u.uid, {
                                    customInstructions: localInstructions,
                                    customInstructionsModified: true
                                });
                            }
                        }

                        // Sync global prompts from cloud with Timestamp comparison
                        if (settings.globalPrompts && Array.isArray(settings.globalPrompts)) {
                            const cloudTime = settings.globalPromptsModifiedAt?.toMillis?.() || 0;
                            const localTime = useStore.getState().globalPromptsModifiedAt || 0;

                            if (cloudTime > localTime) {
                                debugLog.sync(`Cloud globalPrompts is newer, updating Store`);
                                useStore.getState().setGlobalPrompts(settings.globalPrompts, true);
                            }
                        }

                        // Sync FlowStudio User ID (跨设备同步)
                        if (settings.flowStudioUserId) {
                            const localFlowId = localStorage.getItem('flowstudio_user_id');
                            if (!localFlowId || localFlowId !== settings.flowStudioUserId) {
                                localStorage.setItem('flowstudio_user_id', settings.flowStudioUserId);
                                debugLog.sync('FlowStudio UID restored from cloud:', settings.flowStudioUserId);
                            }
                        }

                        // Sync language preference...
                        if (settings.userLanguage) localStorage.setItem('userLanguage', settings.userLanguage);

                        // Load system credits...
                        const activeConfig = useStore.getState().getActiveConfig();
                        if (!activeConfig?.apiKey || activeConfig.apiKey.trim() === '') {
                            useStore.getState().loadSystemCredits?.();
                        }

                        // NEW: Auto-create sample boards for truly new cloud users
                        // Race Condition Fix: Also check if we ONLY have sample boards locally
                        // This handles the case where Init injected samples, but Cloud Sync wiped them from UI (because cloud was empty)
                        const currentBoards = loadBoardsMetadata();
                        const isOnlySamples = currentBoards.length > 0 && currentBoards.every(b => b.id.startsWith('sample-'));

                        if (currentBoards.length === 0 || isOnlySamples) {
                            try {
                                debugLog.auth('New cloud user (or only local samples), ensuring samples are on cloud...');
                                const samples = getSampleBoardsList(); // STATIC IMPORT
                                for (const sample of samples) {
                                    const data = getSampleBoardData(sample.id); // STATIC IMPORT
                                    await saveBoard(sample.id, data);
                                    await saveBoardToCloud(u.uid, sample.id, data);
                                }
                                // Force update state in case Sync wiped it
                                setBoardsList(samples);
                            } catch (err) {
                                console.error("Failed to inject samples", err);
                            }
                        }
                    } else {
                        // No cloud settings = new user (or just created)
                        debugLog.auth('No cloud settings found, checking for onboarding...');
                        const currentBoards = loadBoardsMetadata();
                        if (currentBoards.length === 0) {
                            try {
                                debugLog.auth('No cloud settings & no local boards, injecting samples...');
                                const samples = getSampleBoardsList();
                                // Persist locally
                                const persisted = [];
                                for (const sample of samples) {
                                    const data = getSampleBoardData(sample.id);
                                    await saveBoard(sample.id, data);
                                    persisted.push(sample);
                                }
                                localStorage.setItem('mixboard_boards_list', JSON.stringify(persisted));
                                setBoardsList(persisted);
                            } catch (err) {
                                console.error("Failed to inject samples (local)", err);
                            }
                        }

                        const activeConfig = useStore.getState().getActiveConfig();
                        if (!activeConfig?.apiKey || activeConfig.apiKey.trim() === '') {
                            useStore.getState().loadSystemCredits?.();
                        }
                    }
                });
            } else {
                // User is not logged in
                // CRITICAL FIX: Only clear boards if user was PREVIOUSLY logged in (actual logout)
                // Do NOT clear for guest users who were never logged in - they might have local data
                if (wasEverLoggedIn.current) {
                    debugLog.auth('User logged out, clearing user-specific state...');
                    setBoardsList([]);
                } else {
                    debugLog.auth('Guest user (never logged in), preserving local boards data.');
                }
            }
        });

        return () => { unsubscribe(); if (unsubDb) unsubDb(); };
    }, []);

    return { user, boardsList, setBoardsList, isInitialized };
}
