import { useState, useEffect, useRef } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    loadBoardsMetadata,
    listenForBoardUpdates,
    loadBoard,
    loadUserSettings,
    createBoard,
    saveBoard,
    cleanupExpiredTrash,
    getBoardsList, // New import
    saveBoardToCloud
} from '../services/storage';
import { getRawBoardsList } from '../services/boardService'; // Fix: Import directly to resolve ReferenceError
import { listenForFavoriteUpdates, saveFavoriteToCloud as saveFavoritesToCloud } from '../services/syncService';
import favoritesService from '../services/favoritesService';
import { initScheduledBackup } from '../services/scheduledBackupService';
import { useStore } from '../store/useStore';
import { ONBOARDING_DATA } from '../utils/onboarding';
import { getSampleBoardsList } from '../utils/sampleBoardsData';
import { useLocation } from 'react-router-dom';
import { debugLog } from '../utils/debugLogger';
import { userStatsService } from '../services/stats/userStatsService';

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
            // Run cleanup first
            await cleanupExpiredTrash();

            // Initialize scheduled backup system
            initScheduledBackup();

            const list = loadBoardsMetadata();
            debugLog.storage(`Loaded metadata for ${list.length} boards`);
            setBoardsList(list);

            // Onboarding check - Show sample boards for new users
            if (location.pathname === '/' && list.length === 0) {
                debugLog.auth('No boards found, loading sample boards for new user...');
                const sampleBoards = getSampleBoardsList();

                // IMPORTANT: Persist these samples to LocalStorage/IndexedDB so they are "real" boards
                // This prevents them from disappearing on refresh or conflicting with other logic
                const { getSampleBoardData } = await import('../utils/sampleBoardsData');
                const { saveBoard } = await import('../services/storage');

                const persistedBoards = [];
                for (const sample of sampleBoards) {
                    // Save full data to IndexedDB
                    const fullData = getSampleBoardData(sample.id);
                    await saveBoard(sample.id, fullData);
                    persistedBoards.push(sample);
                }

                // Update metadata in LocalStorage via setBoardsList logic inside storage service would be better
                // but since we are here, we manually update the list and let the state update
                // Note: saveBoard saves the content. We also need to save the metadata list to localStorage
                localStorage.setItem('mixboard_boards_list', JSON.stringify(persistedBoards));

                setBoardsList(persistedBoards);
                debugLog.auth(`Loaded & Persisted ${persistedBoards.length} sample boards for onboarding`);
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
                        if (localBoards.length > 0) {
                            debugLog.sync(`Found ${localBoards.length} local boards. Migrating to cloud (first login)...`);

                            let migratedCount = 0;
                            for (const board of localBoards) {
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

                debugLog.sync('Starting cloud board sync...');
                unsubDb = listenForBoardUpdates(u.uid, (cloudBoards, updatedIds) => {
                    debugLog.sync(`Received cloud update for ${cloudBoards.length} boards`, updatedIds);

                    // MERGE with local state AND localStorage to preserve local-only fields like 'summary'
                    // that may not have synced to cloud yet
                    const localStorageBoards = getRawBoardsList(); // Also check localStorage directly

                    setBoardsList(prev => {
                        const merged = cloudBoards.map(cloudBoard => {
                            // Check React state first
                            const localStateBoard = prev.find(b => b.id === cloudBoard.id);
                            // Then check localStorage as fallback
                            const localStorageBoard = localStorageBoards.find(b => b.id === cloudBoard.id);

                            // Prefer cloud summary, then local state summary, then localStorage summary
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

                    const currentActiveId = localStorage.getItem('mixboard_current_board_id');
                    if (updatedIds && currentActiveId && updatedIds.indexOf(currentActiveId) !== -1) {
                        // CRITICAL FIX: Capture the active ID BEFORE the async operation
                        // to prevent race condition when user switches boards during load
                        const targetBoardId = currentActiveId;
                        debugLog.sync(`Active board ${targetBoardId} updated in cloud, starting rehydration...`);

                        loadBoard(targetBoardId).then(data => {
                            // RACE CONDITION FIX: Verify the active board hasn't changed
                            // during the async loadBoard operation
                            const postLoadActiveId = localStorage.getItem('mixboard_current_board_id');
                            if (postLoadActiveId !== targetBoardId) {
                                debugLog.sync(`[REHYDRATION ABORTED] User navigated from ${targetBoardId} to ${postLoadActiveId} during load. Discarding stale data.`);
                                return;
                            }

                            if (data) {
                                // Additional validation: log card count for debugging
                                debugLog.sync(`Rehydrating board ${targetBoardId} with ${data.cards?.length || 0} cards`);

                                // Use setCardsFromCloud to prevent save loop
                                // This sets isHydratingFromCloud=true temporarily
                                if (data.cards) useStore.getState().setCardsFromCloud?.(data.cards) || setCards(data.cards);
                                if (data.connections) setConnections(data.connections);
                                if (data.groups) setGroups(data.groups);
                                if (data.boardPrompts) setBoardPrompts(data.boardPrompts);
                                debugLog.sync(`Rehydration complete for board ${targetBoardId}`);
                            }
                        });
                    }
                });

                // Listen for favorites
                const unsubFav = listenForFavoriteUpdates(u.uid, (updates) => {
                    favoritesService.updateLocalFavorites(updates);
                });

                // Chain unsubscribe
                const originalUnsubDb = unsubDb;
                unsubDb = () => {
                    originalUnsubDb();
                    unsubFav();
                };

                // Load user stats from cloud
                debugLog.auth('Loading user stats from cloud...');
                userStatsService.loadFromCloud().then(loaded => {
                    if (loaded) {
                        debugLog.auth('User stats merged from cloud');
                    }
                });

                debugLog.auth('Loading user settings from cloud...');
                loadUserSettings(u.uid).then(settings => {
                    (async () => { // Wrap in async for await support
                        if (settings) {
                            debugLog.auth('Cloud settings loaded successfully');
                            // CRITICAL FIX: Sync cloud settings to Store (which handles localStorage persistence)
                            if (settings.providers) {
                                useStore.getState().setFullConfig({
                                    providers: settings.providers,
                                    activeId: settings.activeId || 'google'
                                });
                            }
                            if (settings.s3Config) {
                                localStorage.setItem('mixboard_s3_config', JSON.stringify(settings.s3Config));
                            }

                            // --- Smart Sync: Compare timestamps for customInstructions ---
                            const localData = loadWithTimestamp('mixboard_custom_instructions');
                            const cloudModified = settings.customInstructionsModifiedAt?.toMillis?.() || 0;

                            if (cloudModified > localData.lastModified) {
                                // Cloud is newer, use cloud value
                                debugLog.sync(`Cloud customInstructions is newer (${cloudModified} > ${localData.lastModified}), using cloud`);
                                if (settings.customInstructions) {
                                    saveWithTimestamp('mixboard_custom_instructions', settings.customInstructions);
                                }
                            } else if (localData.lastModified > cloudModified && localData.value) {
                                // Local is newer, sync to cloud
                                debugLog.sync(`Local customInstructions is newer (${localData.lastModified} > ${cloudModified}), syncing to cloud`);
                                import('../services/storage').then(({ updateUserSettings }) => {
                                    updateUserSettings(u.uid, {
                                        customInstructions: localData.value,
                                        customInstructionsModified: true
                                    });
                                });
                            } else if (!cloudModified && !localData.lastModified) {
                                // Neither has timestamp (legacy), fall back to content-based merge
                                if (settings.customInstructions && settings.customInstructions !== localData.value) {
                                    saveWithTimestamp('mixboard_custom_instructions', settings.customInstructions);
                                } else if (localData.value && !settings.customInstructions) {
                                    // Local has data, cloud is empty - sync local to cloud
                                    import('../services/storage').then(({ updateUserSettings }) => {
                                        updateUserSettings(u.uid, {
                                            customInstructions: localData.value,
                                            customInstructionsModified: true
                                        });
                                    });
                                }
                            }

                            // Sync global prompts from cloud
                            if (settings.globalPrompts && Array.isArray(settings.globalPrompts)) {
                                localStorage.setItem('mixboard_global_prompts', JSON.stringify(settings.globalPrompts));
                            }

                            // Sync language preference from cloud
                            if (settings.userLanguage) {
                                localStorage.setItem('userLanguage', settings.userLanguage);
                            } else {
                                // If user has local language valid setting, sync to cloud
                                const localLang = localStorage.getItem('userLanguage');
                                if (localLang) {
                                    import('../services/storage').then(({ updateUserSettings }) => {
                                        updateUserSettings(u.uid, { userLanguage: localLang });
                                    });
                                }
                            }

                            // Load system credits if user has no API key configured
                            const activeConfig = useStore.getState().getActiveConfig();
                            if (!activeConfig?.apiKey || activeConfig.apiKey.trim() === '') {
                                debugLog.auth('No API key configured, loading system credits...');
                                useStore.getState().loadSystemCredits?.();
                            }

                            // NEW: Auto-create sample boards for truly new cloud users
                            const currentBoards = loadBoardsMetadata();
                            if (currentBoards.length === 0) {
                                try {
                                    debugLog.auth('New cloud user with no boards, injecting samples...');
                                    const { getSampleBoardsList, getSampleBoardData } = await import('../utils/sampleBoardsData');
                                    const { saveBoard } = await import('../services/storage');
                                    const samples = getSampleBoardsList();
                                    for (const sample of samples) {
                                        const data = getSampleBoardData(sample.id);
                                        // Save to cloud directly since user is logged in
                                        await saveBoard(sample.id, data);
                                        await saveBoardToCloud(u.uid, sample.id, data);
                                    }
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
                                    const { getSampleBoardsList, getSampleBoardData } = await import('../utils/sampleBoardsData');
                                    const { saveBoard } = await import('../services/storage');
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

                            // Check if we should load credits
                            const activeConfig = useStore.getState().getActiveConfig();
                            if (!activeConfig?.apiKey || activeConfig.apiKey.trim() === '') {
                                debugLog.auth('New user, loading system credits...');
                                useStore.getState().loadSystemCredits?.();
                            }
                        }
                    })(); // End Async IIFE
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

