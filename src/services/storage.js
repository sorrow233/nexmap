// Facade for modular storage services
// This file maintains backward compatibility while delegating to focused modules.

import {
    getCurrentBoardId, setCurrentBoardId, getBoardsList, loadBoardsMetadata,
    createBoard, updateBoardMetadata, saveBoard, loadBoard, deleteBoard,
    getTrashBoards, restoreBoard, permanentlyDeleteBoard, cleanupExpiredTrash,
    saveViewportState, loadViewportState
} from './boardService';

import {
    listenForBoardUpdates, saveBoardToCloud, deleteBoardFromCloud,
    saveUserSettings, loadUserSettings, updateBoardMetadataInCloud
} from './syncService';

import { saveImageToIDB, getImageFromIDB } from './imageStore';

export {
    getCurrentBoardId, setCurrentBoardId, getBoardsList, loadBoardsMetadata,
    createBoard, updateBoardMetadata, saveBoard, loadBoard, deleteBoard,
    getTrashBoards, restoreBoard, permanentlyDeleteBoard, cleanupExpiredTrash,
    saveViewportState, loadViewportState,
    listenForBoardUpdates, saveBoardToCloud, deleteBoardFromCloud,
    saveUserSettings, loadUserSettings, updateBoardMetadataInCloud,
    saveImageToIDB, getImageFromIDB
};

// Compatibility for Local Preview
const StorageService = {
    getCurrentBoardId, setCurrentBoardId, getBoardsList, loadBoardsMetadata,
    createBoard, updateBoardMetadata, saveBoard, loadBoard, deleteBoard,
    saveViewportState, loadViewportState,
    listenForBoardUpdates, saveBoardToCloud, deleteBoardFromCloud,
    saveUserSettings, loadUserSettings,
    getTrashBoards, restoreBoard, permanentlyDeleteBoard, cleanupExpiredTrash, updateBoardMetadataInCloud,
    saveImageToIDB, getImageFromIDB
};

if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
}
