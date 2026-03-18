import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getRawBoardsList } from '../services/boardService';
import { generateBoardAutoTitle } from '../services/ai/boardAutoTitleService';
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
    useEffect(() => {
        if (!boardId || typeof onUpdateBoardMetadata !== 'function') return;

        const activeCardCount = getEffectiveBoardCardCount(cards);
        const isEligible = !isReadOnly &&
            generatingCardIds.length === 0 &&
            shouldAutoNameBoard(board, activeCardCount);

        if (!isEligible) {
            return;
        }

        const timer = setTimeout(() => {
            void (async () => {
                const latestBoard = getRawBoardsList().find(item => item.id === boardId) || board;
                if (!shouldAutoNameBoard(latestBoard, activeCardCount)) return;

                const config = useStore.getState().getRoleConfig('analysis');
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
        board?.updatedAt,
        board?.autoTitleGeneratedAt,
        board?.nameSource,
        cards,
        generatingCardIds.length,
        isReadOnly,
        onUpdateBoardMetadata
    ]);
}
