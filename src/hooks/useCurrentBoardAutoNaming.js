import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getRawBoardsList } from '../services/boardService';
import {
    getEffectiveBoardCardCount,
    shouldAutoNameBoard
} from '../services/boardTitle/metadata';

export function useCurrentBoardAutoNaming({
    board,
    boardId,
    cards,
    generatingCardIds,
    isReadOnly = false,
    onUpdateBoardMetadata
}) {
    const generatingCount = Array.isArray(generatingCardIds)
        ? generatingCardIds.length
        : Number(generatingCardIds?.size || 0);
    const activeCardCount = getEffectiveBoardCardCount(cards);

    useEffect(() => {
        if (!boardId || typeof onUpdateBoardMetadata !== 'function') return;
        const isEligible = !isReadOnly &&
            generatingCount === 0 &&
            shouldAutoNameBoard(board, activeCardCount);

        if (!isEligible) {
            return;
        }

        const timer = setTimeout(() => {
            void (async () => {
                const latestBoard = getRawBoardsList().find(item => item.id === boardId) || board;
                if (!shouldAutoNameBoard(latestBoard, activeCardCount)) return;

                const config = useStore.getState().getRoleConfig('analysis');
                const { generateBoardAutoTitle } = await import('../services/ai/boardAutoTitleService');
                const result = await generateBoardAutoTitle({
                    boardId,
                    boardMeta: latestBoard,
                    boardData: { cards },
                    config
                });

                if (!result?.title) return;

                const freshestBoard = getRawBoardsList().find(item => item.id === boardId) || latestBoard;
                if (!shouldAutoNameBoard(freshestBoard, activeCardCount)) return;

                await onUpdateBoardMetadata(boardId, {
                    name: result.title,
                    nameSource: 'auto',
                    autoTitle: result.title,
                    autoTitleGeneratedAt: Date.now()
                });
            })().catch((error) => {
                console.error(`[BoardAutoNaming] Failed for active board ${boardId}`, error);
            });
        }, 3000);

        return () => clearTimeout(timer);
    }, [
        boardId,
        board?.name,
        board?.autoTitleGeneratedAt,
        board?.nameSource,
        activeCardCount,
        generatingCount,
        isReadOnly,
        onUpdateBoardMetadata
    ]);
}
