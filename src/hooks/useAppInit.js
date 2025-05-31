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
                                activeId: settings.activeId || 'google',
                                roles: settings.roles || { chat: '', analysis: '' }
                            });
                        }
                        if (settings.s3Config) {
                            localStorage.setItem('mixboard_s3_config', JSON.stringify(settings.s3Config));
                        }
                    }
                });
            }
        });

        return () => { unsubscribe(); if (unsubDb) unsubDb(); };
    }, []);

    return { user, boardsList, setBoardsList, isInitialized };
}
