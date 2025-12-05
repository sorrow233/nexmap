import { useState, useEffect } from 'react';
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
    // Initialize from localStorage first to handle guests
    const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
        try {
            return localStorage.getItem('hasVisitedBefore') === 'true';
        } catch (e) {
            return true;
        }
    });
    const { setCards, setConnections, setGroups, setBoardPrompts } = useStore();
    const location = useLocation();

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

            // Onboarding check
            if (location.pathname === '/' && list.length === 0) {
                debugLog.auth('No boards found, triggering onboarding...');
                const newBoard = await createBoard(ONBOARDING_DATA.name);
                await saveBoard(newBoard.id, { cards: ONBOARDING_DATA.cards, connections: ONBOARDING_DATA.connections, groups: ONBOARDING_DATA.groups || [] });
                setBoardsList([newBoard]);
                debugLog.auth('Onboarding board created successfully');
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
                        debugLog.sync(`Active board ${currentActiveId} updated in cloud, rehydrating...`);
                        loadBoard(currentActiveId).then(data => {
                            if (data) {
                                // Use setCardsFromCloud to prevent save loop
                                // This sets isHydratingFromCloud=true temporarily
                                if (data.cards) useStore.getState().setCardsFromCloud?.(data.cards) || setCards(data.cards);
                                if (data.connections) setConnections(data.connections);
                                if (data.groups) setGroups(data.groups);
                                if (data.boardPrompts) setBoardPrompts(data.boardPrompts);
                                debugLog.sync('Rehydration complete');
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
                        // If timestamps are equal, do nothing (already in sync)

                        // Sync global prompts from cloud
                        if (settings.globalPrompts && Array.isArray(settings.globalPrompts)) {
                            localStorage.setItem('mixboard_global_prompts', JSON.stringify(settings.globalPrompts));
                        }

                        // Sync language preference from cloud
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

                        // Check welcome page status from cloud
                        const cloudHasSeen = settings.hasSeenWelcome === true;

                        // If cloud says SEEN, update local state
                        if (cloudHasSeen) {
                            setHasSeenWelcome(true);
                            localStorage.setItem('hasVisitedBefore', 'true');
                            debugLog.auth('Welcome status from cloud: true');
                        }
                        // If cloud says NOT SEEN but local says SEEN, sync local to cloud
                        else if (hasSeenWelcome === true) {
                            debugLog.auth('Local says seen, but cloud is stale/missing. Syncing to cloud...');
                            import('../services/storage').then(({ updateUserSettings }) => {
                                updateUserSettings(u.uid, { hasSeenWelcome: true });
                            });
                        }
                        // Otherwise, follow cloud state if it's explicitly FALSE
                        else if (settings.hasSeenWelcome === false) {
                            setHasSeenWelcome(false);
                            debugLog.auth('Welcome status from cloud: false');
                        }

                        // Load system credits if user has no API key configured
                        const activeConfig = useStore.getState().getActiveConfig();
                        if (!activeConfig?.apiKey || activeConfig.apiKey.trim() === '') {
                            debugLog.auth('No API key configured, loading system credits...');
                            useStore.getState().loadSystemCredits?.();
                        }

                        // NEW: Auto-create guide for truly new cloud users
                        // Only if we just finished loading settings and found no boards
                        const currentBoards = loadBoardsMetadata();
                        if (currentBoards.length === 0) {
                            debugLog.auth('New cloud user with no boards, creating guide...');
                            createBoard("NexMap 使用指南 🚀").then(async (newBoard) => {
                                const { getGuideBoardData } = await import('../utils/guideBoardData');
                                await saveBoard(newBoard.id, getGuideBoardData());
                                setBoardsList([newBoard]);
                            });
                        }
                    } else {
                        // No cloud settings = new user (or just created)
                        debugLog.auth('No cloud settings found, checking for onboarding...');

                        const currentBoards = loadBoardsMetadata();
                        if (currentBoards.length === 0) {
                            createBoard("NexMap 使用指南 🚀").then(async (newBoard) => {
                                const { getGuideBoardData } = await import('../utils/guideBoardData');
                                await saveBoard(newBoard.id, getGuideBoardData());
                                setBoardsList([newBoard]);
                            });
                        }

                        // Check if we should load credits
                        const activeConfig = useStore.getState().getActiveConfig();
                        if (!activeConfig?.apiKey || activeConfig.apiKey.trim() === '') {
                            debugLog.auth('New user, loading system credits...');
                            useStore.getState().loadSystemCredits?.();
                        }
                    }
                });
            } else {
                // User logged out - clear user-specific state to prevent data leakage
                debugLog.auth('User logged out, clearing user-specific state...');
                setBoardsList([]);
            }
        });

        return () => { unsubscribe(); if (unsubDb) unsubDb(); };
    }, []);

    return { user, boardsList, setBoardsList, isInitialized, hasSeenWelcome, setHasSeenWelcome };
}
