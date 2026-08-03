import { useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { loadBoardThumbnailResource } from '../services/boardPersistence/boardThumbnailStorage';
import { loadRemoteBoardThumbnailResource } from '../services/sync/boardThumbnailResourceSync';

export function useBoardThumbnailUrl(
    boardId,
    thumbnailRef,
    legacyThumbnail = '',
    thumbnailUpdatedAt = 0,
    options = {}
) {
    const enabled = options.enabled !== false;
    const [thumbnailUrl, setThumbnailUrl] = useState(enabled ? (legacyThumbnail || '') : '');
    const currentUserId = auth.currentUser?.uid || '';

    useEffect(() => {
        let cancelled = false;
        const fallbackThumbnail = legacyThumbnail || '';

        if (!enabled) {
            setThumbnailUrl('');
            return () => {
                cancelled = true;
            };
        }

        if (!thumbnailRef) {
            setThumbnailUrl(fallbackThumbnail);
            return () => {
                cancelled = true;
            };
        }

        setThumbnailUrl(fallbackThumbnail);
        void loadBoardThumbnailResource(thumbnailRef)
            .then(async (resolvedThumbnail) => {
                if (resolvedThumbnail) {
                    return resolvedThumbnail;
                }
                if (!currentUserId) {
                    return '';
                }
                return loadRemoteBoardThumbnailResource(currentUserId, boardId, thumbnailRef, thumbnailUpdatedAt);
            })
            .then((resolvedThumbnail) => {
                if (cancelled) return;
                setThumbnailUrl(resolvedThumbnail || fallbackThumbnail);
            });

        return () => {
            cancelled = true;
        };
    }, [boardId, currentUserId, enabled, legacyThumbnail, thumbnailRef, thumbnailUpdatedAt]);

    return thumbnailUrl;
}

export default useBoardThumbnailUrl;
