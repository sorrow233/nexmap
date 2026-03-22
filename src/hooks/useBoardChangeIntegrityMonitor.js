import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { runWhenBrowserIdle } from '../utils/idleTask';
import { buildBoardChangeIntegrityHash } from '../store/slices/utils/boardChangeIntegrity';
import {
    createBoardChangeState,
    markBoardChangeStateValidated,
    repairBoardChangeStateIntegrity
} from '../store/slices/utils/boardChangeState';

const INTEGRITY_VALIDATION_IDLE_MS = 5 * 60 * 1000;

export function useBoardChangeIntegrityMonitor({
    boardId,
    cards,
    connections,
    groups,
    boardPrompts,
    boardInstructionSettings,
    boardChangeState,
    isBoardLoading,
    hasGeneratingCards
}) {
    const setBoardChangeState = useStore((state) => state.setBoardChangeState);
    const latestSnapshotRef = useRef({
        boardId,
        cards,
        connections,
        groups,
        boardPrompts,
        boardInstructionSettings,
        isBoardLoading,
        hasGeneratingCards
    });
    const idleCancelRef = useRef(null);

    useEffect(() => {
        latestSnapshotRef.current = {
            boardId,
            cards,
            connections,
            groups,
            boardPrompts,
            boardInstructionSettings,
            isBoardLoading,
            hasGeneratingCards
        };
    }, [
        boardId,
        boardInstructionSettings,
        boardPrompts,
        cards,
        connections,
        groups,
        hasGeneratingCards,
        isBoardLoading
    ]);

    useEffect(() => {
        if (idleCancelRef.current) {
            idleCancelRef.current();
            idleCancelRef.current = null;
        }

        if (!boardId || isBoardLoading || hasGeneratingCards) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            idleCancelRef.current = runWhenBrowserIdle(() => {
                idleCancelRef.current = null;
                const latest = latestSnapshotRef.current;
                if (!latest.boardId || latest.isBoardLoading || latest.hasGeneratingCards) {
                    return;
                }

                const currentBoardChangeState = createBoardChangeState(useStore.getState().boardChangeState);
                const integrityHash = buildBoardChangeIntegrityHash({
                    cards: latest.cards,
                    connections: latest.connections,
                    groups: latest.groups,
                    boardPrompts: latest.boardPrompts,
                    boardInstructionSettings: latest.boardInstructionSettings
                });
                const validatedAt = Date.now();

                if (
                    currentBoardChangeState.lastValidatedRevision === currentBoardChangeState.revision &&
                    currentBoardChangeState.lastIntegrityHash &&
                    currentBoardChangeState.lastIntegrityHash !== integrityHash
                ) {
                    console.warn('[BoardChangeIntegrity] Detected tracked data drift without revision bump, repairing revision', {
                        boardId: latest.boardId,
                        revision: currentBoardChangeState.revision,
                        lastValidatedRevision: currentBoardChangeState.lastValidatedRevision
                    });
                    setBoardChangeState(
                        repairBoardChangeStateIntegrity(currentBoardChangeState, {
                            integrityHash,
                            validatedAt
                        })
                    );
                    return;
                }

                const nextValidatedState = markBoardChangeStateValidated(currentBoardChangeState, {
                    integrityHash,
                    validatedAt,
                    revision: currentBoardChangeState.revision
                });

                if (
                    nextValidatedState.lastIntegrityHash !== currentBoardChangeState.lastIntegrityHash ||
                    nextValidatedState.lastValidatedRevision !== currentBoardChangeState.lastValidatedRevision ||
                    nextValidatedState.lastValidatedAt !== currentBoardChangeState.lastValidatedAt
                ) {
                    setBoardChangeState(nextValidatedState);
                }
            }, {
                timeout: 2000,
                fallbackDelay: 500
            });
        }, INTEGRITY_VALIDATION_IDLE_MS);

        return () => {
            window.clearTimeout(timeoutId);
            if (idleCancelRef.current) {
                idleCancelRef.current();
                idleCancelRef.current = null;
            }
        };
    }, [
        boardChangeState?.lastChangeType,
        boardChangeState?.revision,
        boardId,
        boardInstructionSettings,
        boardPrompts,
        cards,
        connections,
        groups,
        hasGeneratingCards,
        isBoardLoading,
        setBoardChangeState
    ]);
}
