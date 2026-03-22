import { useEffect, useRef } from 'react';
import { normalizeBoardSnapshot } from '../services/sync/boardSnapshot';

const CHANGE_SYNC_DELAY_MS = Object.freeze({
    card_content: 900,
    card_move: 1200,
    card_add: 350,
    card_delete: 350,
    card_restore: 350,
    connection_change: 500,
    group_change: 500,
    board_prompt_change: 500,
    board_instruction_change: 500
});

const SKIPPED_CHANGE_TYPES = new Set([
    'init',
    'sync_apply',
    'local_load',
    'manual_force_override'
]);

const resolveSyncDelay = (changeType) => (
    CHANGE_SYNC_DELAY_MS[changeType] ?? 700
);

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
        if (!boardId || revision <= 0) {
            return undefined;
        }

        if (SKIPPED_CHANGE_TYPES.has(changeType)) {
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
                cards,
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

            latestController.applyLocalSnapshot(nextSnapshot);
        }, resolveSyncDelay(changeType));

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
