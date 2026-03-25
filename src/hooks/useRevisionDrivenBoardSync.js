import { useEffect, useRef } from 'react';
import { normalizeBoardSnapshot } from '../services/sync/boardSnapshot';
import { mergeRuntimeCardBodies } from '../services/cardBodyRuntimeCache';
import {
    buildSkeletonSyncSnapshot,
    isSkeletonSyncChangeType,
    resolveSkeletonSyncDelay
} from '../services/sync/skeleton/skeletonSync';

const SKIPPED_CHANGE_TYPES = new Set([
    'init',
    'sync_apply',
    'local_load',
    'manual_force_override'
]);

export function useRevisionDrivenBoardSync({
    boardId,
    boardSyncControllerRef,
    boardChangeState,
    activeBoardPersistence,
    cards,
    connections,
    groups,
    boardPrompts,
    boardInstructionSettings,
    isBoardLoading,
    hasGeneratingCards
}) {
    const timerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        const revision = Number(boardChangeState?.revision) || 0;
        const changeType = boardChangeState?.lastChangeType || 'init';
        const skeletonEligible = isSkeletonSyncChangeType(changeType);
        if (!boardId || revision <= 0) {
            return undefined;
        }

        if (SKIPPED_CHANGE_TYPES.has(changeType)) {
            return undefined;
        }

        if (!skeletonEligible) {
            return undefined;
        }

        if (isBoardLoading || hasGeneratingCards) {
            return undefined;
        }

        const controller = boardSyncControllerRef.current;
        if (!controller || controller.boardId !== boardId) {
            return undefined;
        }

        timerRef.current = setTimeout(() => {
            const latestController = boardSyncControllerRef.current;
            if (!latestController || latestController.boardId !== boardId) {
                return;
            }

            const nextSnapshot = normalizeBoardSnapshot({
                cards: mergeRuntimeCardBodies(cards, { boardId }),
                connections,
                groups,
                boardPrompts,
                boardInstructionSettings,
                clientRevision: revision,
                updatedAt: Math.max(
                    Date.now(),
                    Number(activeBoardPersistence?.updatedAt) || 0
                )
            });

            latestController.applyLocalSkeletonSnapshot(buildSkeletonSyncSnapshot(nextSnapshot));
        }, resolveSkeletonSyncDelay(changeType));

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [
        activeBoardPersistence?.updatedAt,
        boardChangeState?.lastChangeType,
        boardChangeState?.revision,
        boardId,
        boardInstructionSettings,
        boardPrompts,
        boardSyncControllerRef,
        cards,
        connections,
        groups,
        hasGeneratingCards,
        isBoardLoading
    ]);
}
