// Facade for modular storage services
// This file maintains backward compatibility while delegating to focused modules.

import {
    getCurrentBoardId, setCurrentBoardId, getBoardsList, loadBoardsMetadata,
    createBoard, updateBoardMetadata, saveBoard, loadBoard, deleteBoard,
    getTrashBoards, restoreBoard, permanentlyDeleteBoard, cleanupExpiredTrash,
    saveViewportState, loadViewportState, loadBoardDataForSearch
} from './boardService';

import {
    listenForBoardUpdates, listenForBoardsMetadata, listenForSingleBoard,
    saveBoardToCloud, deleteBoardFromCloud,
    saveUserSettings, loadUserSettings, updateBoardMetadataInCloud, updateUserSettings
} from './syncService';

import { saveImageToIDB, getImageFromIDB } from './imageStore';

export {
    getCurrentBoardId, setCurrentBoardId, getBoardsList, loadBoardsMetadata,
    createBoard, updateBoardMetadata, saveBoard, loadBoard, deleteBoard,
    getTrashBoards, restoreBoard, permanentlyDeleteBoard, cleanupExpiredTrash,
    saveViewportState, loadViewportState, loadBoardDataForSearch,
    listenForBoardUpdates, listenForBoardsMetadata, listenForSingleBoard,
    saveBoardToCloud, deleteBoardFromCloud,
    saveUserSettings, loadUserSettings, updateBoardMetadataInCloud, updateUserSettings,
    saveImageToIDB, getImageFromIDB
};

// Compatibility for Local Preview
const StorageService = {
    getCurrentBoardId, setCurrentBoardId, getBoardsList, loadBoardsMetadata,
    createBoard, updateBoardMetadata, saveBoard, loadBoard, deleteBoard,
    saveViewportState, loadViewportState, loadBoardDataForSearch,
    listenForBoardUpdates, listenForBoardsMetadata, listenForSingleBoard,
    saveBoardToCloud, deleteBoardFromCloud,
    saveUserSettings, loadUserSettings, updateUserSettings,
    getTrashBoards, restoreBoard, permanentlyDeleteBoard, cleanupExpiredTrash, updateBoardMetadataInCloud,
    saveImageToIDB, getImageFromIDB
};

if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
}
