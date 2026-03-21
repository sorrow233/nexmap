import { idbDel } from '../db/indexedDB';
import { debugLog } from '../../utils/debugLogger';
import { normalizeBoardTitleMeta } from '../boardTitle/metadata';
import { persistBoardsMetadataList } from '../boardPersistence/boardsListStorage';
import { BOARD_PREFIX, VIEWPORT_PREFIX } from './constants';
import { getRawBoardsList, getTrashBoards } from './list';

export const cleanupExpiredTrash = async () => {
    const list = getTrashBoards();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const board of list) {
        if (board.deletedAt && board.deletedAt < thirtyDaysAgo) {
            debugLog.storage(`Board ${board.id} expired (deleted > 30 days ago). Permanently removing.`);
            await permanentlyDeleteBoard(board.id);
            deletedCount += 1;
        }
    }

    if (deletedCount > 0) {
        debugLog.storage(`Cleanup removed ${deletedCount} expired boards from trash.`);
    }
};

export const cleanupExpiredCards = (boardData, retentionDays = 30) => {
    if (!boardData?.cards) return boardData;

    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const originalCount = boardData.cards.length;
    const cleanedCards = boardData.cards.filter(card => {
        if (!card.deletedAt) return true;
        if (card.deletedAt > cutoffTime) return true;
        debugLog.storage(`Card ${card.id} expired (deleted > ${retentionDays} days ago). Permanently removing.`);
        return false;
    });

    const removedCount = originalCount - cleanedCards.length;
    if (removedCount > 0) {
        debugLog.storage(`Cleanup removed ${removedCount} expired cards from board.`);
    }

    return { ...boardData, cards: cleanedCards };
};

export const deleteBoard = async (id) => {
    debugLog.storage(`Soft deleting board: ${id}`);
    const list = getRawBoardsList();
    const boardIndex = list.findIndex(board => board.id === id);
    if (boardIndex >= 0) {
        list[boardIndex] = normalizeBoardTitleMeta({ ...list[boardIndex], deletedAt: Date.now() });
        persistBoardsMetadataList(list, { reason: `deleteBoard:${id}` });
    } else {
        debugLog.error(`Board ${id} not found for soft deletion.`);
    }
};

export const restoreBoard = async (id) => {
    debugLog.storage(`Restoring board: ${id}`);
    const list = getRawBoardsList();
    const boardIndex = list.findIndex(board => board.id === id);
    if (boardIndex < 0) {
        return false;
    }

    const { deletedAt, ...rest } = list[boardIndex];
    list[boardIndex] = normalizeBoardTitleMeta(rest);
    persistBoardsMetadataList(list, { reason: `restoreBoard:${id}` });
    return true;
};

export const permanentlyDeleteBoard = async (id) => {
    debugLog.storage(`Permanently deleting board: ${id}`);
    const list = getRawBoardsList();
    const newList = list.filter(board => board.id !== id);
    persistBoardsMetadataList(newList, { reason: `permanentlyDeleteBoard:${id}` });

    await idbDel(BOARD_PREFIX + id);
    localStorage.removeItem(BOARD_PREFIX + id);
    localStorage.removeItem(`${VIEWPORT_PREFIX}${id}`);
};
