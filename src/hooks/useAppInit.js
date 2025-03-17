import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    loadBoardsMetadata,
    listenForBoardUpdates,
    loadBoard,
    loadUserSettings,
    createBoard,
    saveBoard
} from '../services/storage';
import { useStore } from '../store/useStore';
import { ONBOARDING_DATA } from '../utils/onboarding';
import { useLocation } from 'react-router-dom';

export function useAppInit() {
    const [user, setUser] = useState(null);
    const [boardsList, setBoardsList] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const { setCards } = useStore();
    const location = useLocation();

    // Load initial boards metadata
    useEffect(() => {
        const init = async () => {
            const list = loadBoardsMetadata();
            setBoardsList(list);

            // Onboarding check
            if (location.pathname === '/' && list.length === 0) {
                const newBoard = await createBoard(ONBOARDING_DATA.name);
                await saveBoard(newBoard.id, { cards: ONBOARDING_DATA.cards, connections: ONBOARDING_DATA.connections });
                setBoardsList([newBoard]);
                // Note: Navigation to the new board happens in the component if needed, 
                // but here we just ensure the data is ready.
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
            if (unsubDb) { unsubDb(); unsubDb = null; }

            if (u) {
                unsubDb = listenForBoardUpdates(u.uid, (cloudBoards, updatedIds) => {
                    setBoardsList(cloudBoards);
                    const currentActiveId = localStorage.getItem('mixboard_current_board_id');
                    if (updatedIds && currentActiveId && updatedIds.indexOf(currentActiveId) !== -1) {
                        loadBoard(currentActiveId).then(data => {
                            if (data && data.cards) setCards(data.cards);
                        });
                    }
                });

                loadUserSettings(u.uid).then(settings => {
                    if (settings) {
                        if (settings.providers) {
                            localStorage.setItem('mixboard_providers_v3', JSON.stringify({
                                providers: settings.providers,
                                activeId: settings.activeId || 'google'
                            }));
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
