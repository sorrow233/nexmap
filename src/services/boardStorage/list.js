import { debugLog } from '../../utils/debugLogger';
import { readBoardsMetadataListFromStorage } from '../boardPersistence/boardsListStorage';

export const getRawBoardsList = () => {
    return readBoardsMetadataListFromStorage();
};

export const getBoardsList = () => {
    return getRawBoardsList().filter(board => !board.deletedAt);
};

export const getTrashBoards = () => {
    return getRawBoardsList().filter(board => board.deletedAt);
};

export const loadBoardsMetadata = () => {
    debugLog.storage('Loading boards metadata list');
    return getRawBoardsList();
};
