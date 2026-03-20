import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    loadBoardsMetadata,
    saveBoard,
    cleanupExpiredTrash
} from '../services/storage';
import { initScheduledBackup } from '../services/scheduledBackupService';
import { getSampleBoardsList, getSampleBoardData } from '../utils/sampleBoardsData';
import { debugLog } from '../utils/debugLogger';
import { normalizeBoardMetadataList } from '../services/boardTitle/metadata';
import { persistBoardsMetadataList } from '../services/boardPersistence/boardsListStorage';
import { useStore } from '../store/useStore';

const TRASH_CLEANUP_LAST_KEY = 'mixboard_last_trash_cleanup_at';
const TRASH_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function useAppInit() {
    const [user, setUser] = useState(null);
    const [boardsList, setBoardsList] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const init = async () => {
            debugLog.auth('Initializing local app state...');

            try {
                localStorage.removeItem('mixboard_offline_mode');
                const now = Date.now();
                const lastCleanup = Number(localStorage.getItem(TRASH_CLEANUP_LAST_KEY) || 0);
                const shouldRunCleanup = !Number.isFinite(lastCleanup) || now - lastCleanup >= TRASH_CLEANUP_INTERVAL_MS;

                if (shouldRunCleanup) {
                    cleanupExpiredTrash()
                        .then(() => {
                            localStorage.setItem(TRASH_CLEANUP_LAST_KEY, String(Date.now()));
                        })
                        .catch((error) => {
                            debugLog.error('Scheduled trash cleanup failed', error);
                        });
                }
            } catch (error) {
                debugLog.error('Failed to schedule trash cleanup', error);
            }

            initScheduledBackup();

            const localBoards = loadBoardsMetadata();
            if (localBoards.length > 0) {
                setBoardsList(normalizeBoardMetadataList(localBoards));
                setIsInitialized(true);
                return;
            }

            debugLog.auth('No local boards found, injecting onboarding samples...');
            const sampleBoards = getSampleBoardsList();
            setBoardsList(normalizeBoardMetadataList(sampleBoards));

            const persistedBoards = [];
            for (const sample of sampleBoards) {
                const fullData = getSampleBoardData(sample.id);
                await saveBoard(sample.id, fullData);
                persistedBoards.push(sample);
            }

            persistBoardsMetadataList(persistedBoards, { reason: 'useAppInit:onboarding-samples' });
            setIsInitialized(true);
        };

        void init();
    }, []);

    useEffect(() => {
        if (!auth) return undefined;

        const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
            setUser(nextUser);
            debugLog.auth(nextUser ? `User logged in: ${nextUser.email}` : 'User logged out');

            if (!nextUser) {
                return;
            }

            const activeConfig = useStore.getState().getActiveConfig();
            if (!activeConfig?.apiKey || activeConfig.apiKey.trim() === '') {
                useStore.getState().loadSystemCredits?.();
            }
        });

        return () => unsubscribe();
    }, []);

    return { user, boardsList, setBoardsList, isInitialized };
}
