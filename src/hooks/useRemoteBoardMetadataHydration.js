import { useEffect, useRef, useState } from 'react';
import {
    loadRemoteBoardMetadataList,
    mergeBoardMetadataLists
} from '../services/sync/boardMetadataSync';
import {
    getRemoteMetadataRetryDelay,
    isNetworkAvailable
} from '../services/sync/networkRetryPolicy';
import { persistBoardsMetadataList } from '../services/boardPersistence/boardsListStorage';

const clearRetryTimer = (timerRef) => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
};

const describeHydrationError = (error, retryInMs) => ({
    code: error?.code || '',
    message: error?.message || String(error || 'Unknown Firestore error'),
    retryInMs
});

export const useRemoteBoardMetadataHydration = ({ userId, setBoardsList }) => {
    const retryTimerRef = useRef(null);
    const [hasHydratedRemoteBoards, setHasHydratedRemoteBoards] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let retryAttempt = 0;
        let hydrationInFlight = false;
        let hydrationComplete = false;

        clearRetryTimer(retryTimerRef);
        setHasHydratedRemoteBoards(false);

        if (!userId) {
            return () => {
                cancelled = true;
                clearRetryTimer(retryTimerRef);
            };
        }

        const scheduleRetry = (hydrateRemoteBoards, error) => {
            if (cancelled || !isNetworkAvailable()) return;

            const retryInMs = getRemoteMetadataRetryDelay(retryAttempt);
            retryAttempt += 1;
            console.warn(
                '[FirebaseSync] Remote boards metadata unavailable; retry scheduled.',
                describeHydrationError(error, retryInMs)
            );

            clearRetryTimer(retryTimerRef);
            retryTimerRef.current = setTimeout(() => {
                retryTimerRef.current = null;
                void hydrateRemoteBoards();
            }, retryInMs);
        };

        const hydrateRemoteBoards = async () => {
            if (cancelled || hydrationInFlight || hydrationComplete || !isNetworkAvailable()) return;
            hydrationInFlight = true;

            try {
                const remoteBoards = await loadRemoteBoardMetadataList(userId);
                if (cancelled) return;

                setBoardsList((previousBoards) => {
                    const mergedBoards = mergeBoardMetadataLists(previousBoards, remoteBoards);
                    if (mergedBoards.length > 0) {
                        persistBoardsMetadataList(mergedBoards, {
                            reason: 'firebase_sync:hydrate_remote_metadata'
                        });
                    }
                    return mergedBoards.length > 0 ? mergedBoards : previousBoards;
                });
                hydrationComplete = true;
                retryAttempt = 0;
                setHasHydratedRemoteBoards(true);
            } catch (error) {
                if (!cancelled) {
                    scheduleRetry(hydrateRemoteBoards, error);
                }
            } finally {
                hydrationInFlight = false;
            }
        };

        const handleOnline = () => {
            if (cancelled || hydrationComplete) return;
            clearRetryTimer(retryTimerRef);
            retryAttempt = 0;
            void hydrateRemoteBoards();
        };

        window.addEventListener('online', handleOnline);
        void hydrateRemoteBoards();

        return () => {
            cancelled = true;
            clearRetryTimer(retryTimerRef);
            window.removeEventListener('online', handleOnline);
        };
    }, [userId, setBoardsList]);

    return hasHydratedRemoteBoards;
};
