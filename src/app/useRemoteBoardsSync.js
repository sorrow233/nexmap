import { useEffect, useRef, useState } from 'react';
import { FIREBASE_SYNC_LIMITS } from '../services/sync/config';
import {
    loadRemoteBoardMetadataList,
    mergeBoardMetadataLists,
    syncBoardMetadataListToRemote
} from '../services/sync/boardMetadataSync';
import { persistBoardsMetadataList } from '../services/boardPersistence/boardsListStorage';

const REMOTE_METADATA_RETRY_MS = 5000;

export function useRemoteBoardsSync({ userUid, boardsList, setBoardsList }) {
    const [hasHydratedRemoteBoards, setHasHydratedRemoteBoards] = useState(false);
    const metadataSyncTimerRef = useRef(null);
    const metadataHydrationRetryTimerRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        setHasHydratedRemoteBoards(false);
        if (metadataHydrationRetryTimerRef.current) {
            clearTimeout(metadataHydrationRetryTimerRef.current);
            metadataHydrationRetryTimerRef.current = null;
        }

        if (!userUid) {
            return () => {
                cancelled = true;
                if (metadataHydrationRetryTimerRef.current) {
                    clearTimeout(metadataHydrationRetryTimerRef.current);
                    metadataHydrationRetryTimerRef.current = null;
                }
            };
        }

        const hydrateRemoteBoards = async () => {
            try {
                const remoteBoards = await loadRemoteBoardMetadataList(userUid);
                if (cancelled) return;

                setBoardsList((prev) => {
                    const merged = mergeBoardMetadataLists(prev, remoteBoards);
                    if (merged.length > 0) {
                        persistBoardsMetadataList(merged, { reason: 'firebase_sync:hydrate_remote_metadata' });
                    }
                    return merged.length > 0 ? merged : prev;
                });
                setHasHydratedRemoteBoards(true);
            } catch (error) {
                if (cancelled) return;
                console.error('[FirebaseSync] Failed to hydrate remote boards metadata:', error);
                setHasHydratedRemoteBoards(false);
                metadataHydrationRetryTimerRef.current = setTimeout(() => {
                    metadataHydrationRetryTimerRef.current = null;
                    if (!cancelled) {
                        void hydrateRemoteBoards();
                    }
                }, REMOTE_METADATA_RETRY_MS);
            }
        };

        void hydrateRemoteBoards();

        return () => {
            cancelled = true;
            if (metadataHydrationRetryTimerRef.current) {
                clearTimeout(metadataHydrationRetryTimerRef.current);
                metadataHydrationRetryTimerRef.current = null;
            }
        };
    }, [userUid, setBoardsList]);

    useEffect(() => {
        if (!userUid || !hasHydratedRemoteBoards) return undefined;

        if (metadataSyncTimerRef.current) {
            clearTimeout(metadataSyncTimerRef.current);
        }

        metadataSyncTimerRef.current = setTimeout(() => {
            void syncBoardMetadataListToRemote(userUid, boardsList).catch((error) => {
                console.error('[FirebaseSync] Failed to sync boards metadata:', error);
            });
        }, FIREBASE_SYNC_LIMITS.metadataSyncDebounceMs);

        return () => {
            if (metadataSyncTimerRef.current) {
                clearTimeout(metadataSyncTimerRef.current);
                metadataSyncTimerRef.current = null;
            }
        };
    }, [boardsList, hasHydratedRemoteBoards, userUid]);

    return { hasHydratedRemoteBoards };
}
