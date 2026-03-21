import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService';
import {
    normalizeBoardMetadataList,
    normalizeBoardTitleMeta
} from '../boardTitle/metadata';
import { debugLog } from '../../utils/debugLogger';
import { persistBoardsMetadataList } from '../boardPersistence/boardsListStorage';
import { CURRENT_BOARD_ID_KEY } from './constants';
import { getRawBoardsList } from './list';
import { saveBoard } from './persistence';

export const getCurrentBoardId = () => sessionStorage.getItem(CURRENT_BOARD_ID_KEY);

export const setCurrentBoardId = (id) => {
    debugLog.storage(`Setting current board to: ${id}`);
    if (id) sessionStorage.setItem(CURRENT_BOARD_ID_KEY, id);
    else sessionStorage.removeItem(CURRENT_BOARD_ID_KEY);
};

export const createBoard = async (name) => {
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const newBoard = normalizeBoardTitleMeta({
        id: Date.now().toString(),
        name: normalizedName,
        nameSource: normalizedName ? 'manual' : 'placeholder',
        autoTitle: '',
        autoTitleGeneratedAt: 0,
        manualTitleUpdatedAt: normalizedName ? Date.now() : 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        cardCount: 0,
        clientRevision: 0
    });

    debugLog.storage(`Creating new board: ${newBoard.name}`, { id: newBoard.id });

    const list = getRawBoardsList();
    const newList = normalizeBoardMetadataList([newBoard, ...list]);
    persistBoardsMetadataList(newList, { reason: `createBoard:${newBoard.id}` });

    await saveBoard(newBoard.id, {
        cards: [],
        connections: [],
        groups: [],
        boardPrompts: [],
        boardInstructionSettings: normalizeBoardInstructionSettings(DEFAULT_BOARD_INSTRUCTION_SETTINGS)
    });

    return newBoard;
};

export const updateBoardMetadata = (id, metadata) => {
    debugLog.storage(`Updating metadata for board: ${id}`, metadata);
    const list = getRawBoardsList();
    const boardIndex = list.findIndex(board => board.id === id);
    if (boardIndex < 0) {
        return false;
    }

    list[boardIndex] = normalizeBoardTitleMeta({
        ...list[boardIndex],
        ...metadata,
        updatedAt: Date.now()
    });
    persistBoardsMetadataList(list, { reason: `updateBoardMetadata:${id}` });
    return true;
};
