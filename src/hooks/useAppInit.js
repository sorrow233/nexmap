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
    cleanupExpiredTrash // New import
} from '../services/storage';
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

            // On logout, clear board list state
            if (!u) {
                setBoardsList([]);
            }

            if (unsubDb) {
                debugLog.sync('Cleaning up previous cloud listener');
                unsubDb();
                unsubDb = null;
            }

            if (u) {
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
                        if (settings.hasSeenWelcome !== undefined) {
                            setHasSeenWelcome(settings.hasSeenWelcome === true);
                            debugLog.auth(`Welcome status from cloud: ${settings.hasSeenWelcome}`);
                        } else {
                            // If cloud doesn't have it (migration), keep local state but likely sync it up later
                            // actually, for consistency, if no cloud setting and local says NOT SEEN (new user),
                            // we should probably trust local or default to NOT seen?
                            // Actually, simpler: if undefined, treat as new user unless localstorage says otherwise.
                            // But we already init from localstorage.
                            // Let's defer to the "Not cloud settings" block logic if strictly empty?
                            // No, settings object exists but field missing.
                            // Let's treat undefined as "trust local state"
                        }

                        // Load system credits if user has no API key configured
                        const activeConfig = useStore.getState().getActiveConfig();
                        if (!activeConfig?.apiKey || activeConfig.apiKey.trim() === '') {
                            debugLog.auth('No API key configured, loading system credits...');
                            useStore.getState().loadSystemCredits?.();
                        }
                    } else {
                        // No cloud settings = new user (or just created)
                        // Trust local flag OR default to false if really fresh
                        // But init already handled local flag.
                        // If we are here, settings are null.
                        // Force false only if strictly new?
                        // Let's explicitly set to false if local is also false/missing (implicitly handled by init state)
                        // But to be safe for cross-device:
                        setHasSeenWelcome(false);
                        debugLog.auth('New user detected, will show welcome page');

                        // Check if we should load credits
                        const activeConfig = useStore.getState().getActiveConfig();
                        if (!activeConfig?.apiKey || activeConfig.apiKey.trim() === '') {
                            debugLog.auth('New user, loading system credits...');
                            useStore.getState().loadSystemCredits?.();
                        }
                    }
                });
            }
        });

        return () => { unsubscribe(); if (unsubDb) unsubDb(); };
    }, []);

    return { user, boardsList, setBoardsList, isInitialized, hasSeenWelcome, setHasSeenWelcome };
}
