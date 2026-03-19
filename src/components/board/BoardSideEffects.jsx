import React, { useEffect, useMemo, useRef } from 'react';
import useBoardBackground from '../../hooks/useBoardBackground';
import { useBoardPersistence } from '../../hooks/useBoardPersistence';
import { useCurrentBoardAutoNaming } from '../../hooks/useCurrentBoardAutoNaming';
import { useStore } from '../../store/useStore';
import { useToast } from '../Toast';
import {
    createAutoImageTriggeredPatch,
    hasAutoImageTriggered
} from '../../services/boardAutoGeneration/metadata';

const AUTO_IMAGE_TRIGGERED_BOARDS = new Set();
const AUTO_SUMMARY_TRIGGERED_BOARDS = new Set();

const BoardSideEffects = React.memo(function BoardSideEffects({
    board,
    boardId,
    user,
    isReadOnly = false,
    onUpdateBoardMetadata,
    setCloudSyncStatus
}) {
    const toast = useToast();
    const cards = useStore(state => state.cards);
    const connections = useStore(state => state.connections);
    const groups = useStore(state => state.groups);
    const boardPrompts = useStore(state => state.boardPrompts);
    const boardInstructionSettings = useStore(state => state.boardInstructionSettings);
    const generatingCardIds = useStore(state => state.generatingCardIds);
    const offset = useStore(state => state.offset);
    const scale = useStore(state => state.scale);
    const isBoardLoading = useStore(state => state.isBoardLoading);
    const isHydratingFromCloud = useStore(state => state.isHydratingFromCloud);
    const setLastSavedAt = useStore(state => state.setLastSavedAt);
    const setActiveBoardPersistence = useStore(state => state.setActiveBoardPersistence);
    const { generateBoardSummary, generateBoardImage } = useBoardBackground();
    const hasAutoImageGeneratedRef = useRef(false);
    const hasAutoSummaryGeneratedRef = useRef(false);

    useCurrentBoardAutoNaming({
        board,
        boardId,
        cards,
        generatingCardIds,
        isReadOnly,
        onUpdateBoardMetadata
    });

    useBoardPersistence({
        boardId,
        user,
        cards,
        connections,
        groups,
        boardPrompts,
        boardInstructionSettings,
        offset,
        scale,
        isBoardLoading,
        isHydratingFromCloud,
        isReadOnly,
        setCloudSyncStatus,
        setLastSavedAt,
        setActiveBoardPersistence,
        toast
    });

    const activeCardCount = useMemo(
        () => cards.reduce((count, card) => count + (card?.deletedAt ? 0 : 1), 0),
        [cards]
    );

    useEffect(() => {
        if (!boardId) return;
        hasAutoImageGeneratedRef.current = AUTO_IMAGE_TRIGGERED_BOARDS.has(boardId);
        hasAutoSummaryGeneratedRef.current = AUTO_SUMMARY_TRIGGERED_BOARDS.has(boardId);
    }, [boardId]);

    useEffect(() => {
        if (!boardId) return;
        if (board?.summary) {
            AUTO_SUMMARY_TRIGGERED_BOARDS.add(boardId);
            hasAutoSummaryGeneratedRef.current = true;
        }
        if (board?.backgroundImage) {
            AUTO_IMAGE_TRIGGERED_BOARDS.add(boardId);
            hasAutoImageGeneratedRef.current = true;
        }
        if (hasAutoImageTriggered(board)) {
            AUTO_IMAGE_TRIGGERED_BOARDS.add(boardId);
            hasAutoImageGeneratedRef.current = true;
        }
    }, [board?.backgroundImage, board?.summary, board?.autoImageTriggeredAt, boardId]);

    useEffect(() => {
        if (isReadOnly || !boardId) return;

        const hasSummaryTriggered = hasAutoSummaryGeneratedRef.current || AUTO_SUMMARY_TRIGGERED_BOARDS.has(boardId);
        const hasImageTriggered = hasAutoImageGeneratedRef.current || AUTO_IMAGE_TRIGGERED_BOARDS.has(boardId);

        if (activeCardCount > 3 && !hasSummaryTriggered && !board?.summary && !board?.backgroundImage) {
            void generateBoardSummary(boardId, (id, updates) => {
                if (onUpdateBoardMetadata) {
                    return onUpdateBoardMetadata(id, updates);
                }
                return Promise.resolve();
            });
            hasAutoSummaryGeneratedRef.current = true;
            AUTO_SUMMARY_TRIGGERED_BOARDS.add(boardId);
        }

        if (activeCardCount > 10 && !hasImageTriggered && !board?.backgroundImage && !hasAutoImageTriggered(board)) {
            hasAutoImageGeneratedRef.current = true;
            AUTO_IMAGE_TRIGGERED_BOARDS.add(boardId);
            void (async () => {
                if (onUpdateBoardMetadata) {
                    await onUpdateBoardMetadata(boardId, createAutoImageTriggeredPatch());
                }
                return generateBoardImage(boardId, (id, updates) => {
                    if (onUpdateBoardMetadata) {
                        return onUpdateBoardMetadata(id, updates);
                    }
                    return Promise.resolve();
                });
            })();
        }
    }, [
        activeCardCount,
        board?.backgroundImage,
        board?.summary,
        board?.autoImageTriggeredAt,
        boardId,
        generateBoardImage,
        generateBoardSummary,
        isReadOnly,
        onUpdateBoardMetadata
    ]);

    return null;
});

export default BoardSideEffects;
