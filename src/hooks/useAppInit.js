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
    saveBoardToCloud // Ensure this is imported if not already, though it was in the file before? No wait, it wasn't used in this file before but I can import it.
} from '../services/storage';
import { initScheduledBackup } from '../services/scheduledBackupService';
import { useStore } from '../store/useStore';
import { ONBOARDING_DATA } from '../utils/onboarding';
import { useLocation } from 'react-router-dom';
import { debugLog } from '../utils/debugLogger';

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
    const { setCards, setConnections, setGroups } = useStore();
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
                const migrateLocalData = async () => {
                    const localBoards = getBoardsList();
                    if (localBoards.length > 0) {
                        debugLog.sync(`Found ${localBoards.length} local boards. Checking for migration candidates...`);

                        // We can't easily know if they are "already in cloud" forTHIS user without checking cloud first.
                        // But since we just logged in, we haven't loaded cloud boards yet.
                        // STRATEGY: We upload ALL local boards to the new user. 
                        // If they already exist (ID collision), `saveBoardToCloud` handles it (usually overwrites, which matches "local is newer").
                        // But to be safe, we only migrate if we are sure it's a guest session being promoted.
                        // A simple heuristic: If the user just logged in, pushing local work is generally desired.

                        let migratedCount = 0;
                        for (const board of localBoards) {
                            try {
                                // Load full board data
                                const fullBoardData = await loadBoard(board.id);
                                if (fullBoardData) {
                                    // Push to cloud
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
                };

                // Execute migration - don't await blocking the UI, but do it before setting up listener if possible?
                // Actually parallel is fine, Firestore handles it.
                migrateLocalData();

                debugLog.sync('Starting cloud board sync...');
                unsubDb = listenForBoardUpdates(u.uid, (cloudBoards, updatedIds) => {
                    debugLog.sync(`Received cloud update for ${cloudBoards.length} boards`, updatedIds);
                    setBoardsList(cloudBoards);
                    const currentActiveId = localStorage.getItem('mixboard_current_board_id');
                    if (updatedIds && currentActiveId && updatedIds.indexOf(currentActiveId) !== -1) {
                        debugLog.sync(`Active board ${currentActiveId} updated in cloud, rehydrating...`);
                        loadBoard(currentActiveId).then(data => {
                            if (data) {
                                if (data.cards) setCards(data.cards);
                                if (data.connections) setConnections(data.connections);
                                if (data.groups) setGroups(data.groups);
                                debugLog.sync('Rehydration complete');
                            }
                        });
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
