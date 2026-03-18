import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { loadBoard } from '../services/storage';
import { getRawBoardsList } from '../services/boardService';
import { generateBoardAutoTitle } from '../services/ai/boardAutoTitleService';
import {
    getEffectiveBoardCardCount,
    normalizeBoardTitleMeta,
    shouldAutoNameBoard
} from '../services/boardTitle/metadata';

const MAX_CONCURRENT_JOBS = 2;

export function useAutoBoardNaming(boardsList, onUpdateBoardMetadata) {
    const queueRef = useRef([]);
    const inFlightRef = useRef(0);
    const enqueuedBoardIdsRef = useRef(new Set());
    const checkedUpdatedAtRef = useRef(new Map());

    useEffect(() => {
        if (typeof onUpdateBoardMetadata !== 'function') return;

        boardsList.forEach(board => {
            const normalizedBoard = normalizeBoardTitleMeta(board);
            const updatedAt = Number(normalizedBoard?.updatedAt || 0);
            const checkedUpdatedAt = checkedUpdatedAtRef.current.get(normalizedBoard.id);

            if (!normalizedBoard?.id) return;
            if (normalizedBoard.deletedAt) return;
            if (checkedUpdatedAt === updatedAt) return;
            if (normalizedBoard.nameSource === 'manual' || normalizedBoard.autoTitleGeneratedAt > 0) return;
            if (enqueuedBoardIdsRef.current.has(normalizedBoard.id)) return;

            queueRef.current.push(normalizedBoard.id);
            enqueuedBoardIdsRef.current.add(normalizedBoard.id);
        });

        const pumpQueue = () => {
            while (inFlightRef.current < MAX_CONCURRENT_JOBS && queueRef.current.length > 0) {
                const boardId = queueRef.current.shift();
                if (!boardId) continue;

                inFlightRef.current += 1;

                void (async () => {
                    try {
                        const latestBoard = getRawBoardsList().find(item => item.id === boardId);
                        if (!latestBoard) return;

                        const boardData = await loadBoard(boardId);
                        const activeCardCount = getEffectiveBoardCardCount(boardData?.cards);

                        if (!shouldAutoNameBoard(latestBoard, activeCardCount)) {
                            checkedUpdatedAtRef.current.set(boardId, Number(latestBoard.updatedAt || 0));
                            return;
                        }

                        const config = useStore.getState().getRoleConfig('analysis');
                        const result = await generateBoardAutoTitle({
                            boardId,
                            boardMeta: latestBoard,
                            boardData,
                            config
                        });

                        if (!result?.title) {
                            checkedUpdatedAtRef.current.set(boardId, Number(latestBoard.updatedAt || 0));
                            return;
                        }

                        const freshestBoard = getRawBoardsList().find(item => item.id === boardId);
                        if (!freshestBoard || !shouldAutoNameBoard(freshestBoard, activeCardCount)) {
                            if (freshestBoard) {
                                checkedUpdatedAtRef.current.set(boardId, Number(freshestBoard.updatedAt || 0));
                            }
                            return;
                        }

                        await onUpdateBoardMetadata(boardId, {
                            name: result.title,
                            nameSource: 'auto',
                            autoTitle: result.title,
                            autoTitleGeneratedAt: Date.now()
                        });
                    } catch (error) {
                        console.error(`[BoardAutoNaming] Failed for board ${boardId}`, error);
                    } finally {
                        enqueuedBoardIdsRef.current.delete(boardId);
                        inFlightRef.current = Math.max(0, inFlightRef.current - 1);
                        pumpQueue();
                    }
                })();
            }
        };

        pumpQueue();
    }, [boardsList, onUpdateBoardMetadata]);
}
