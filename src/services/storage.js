// Facade for modular storage services
// This file maintains backward compatibility while delegating to focused modules.

import {
    getCurrentBoardId, setCurrentBoardId, getBoardsList, loadBoardsMetadata,
    createBoard, updateBoardMetadata, saveBoard, loadBoard, deleteBoard,
    getTrashBoards, restoreBoard, permanentlyDeleteBoard, cleanupExpiredTrash,
    saveViewportState, loadViewportState, loadBoardDataForSearch,
    emergencyLocalSave
} from './boardService';

import {
    saveUserSettings,
    loadUserSettings,
    updateUserSettings
} from './userSettingsStorage';

import { saveImageToIDB, getImageFromIDB } from './imageStore';

export {
    getCurrentBoardId, setCurrentBoardId, getBoardsList, loadBoardsMetadata,
    createBoard, updateBoardMetadata, saveBoard, loadBoard, deleteBoard,
    getTrashBoards, restoreBoard, permanentlyDeleteBoard, cleanupExpiredTrash,
    saveViewportState, loadViewportState, loadBoardDataForSearch, emergencyLocalSave,
    saveUserSettings, loadUserSettings, updateUserSettings,
    saveImageToIDB, getImageFromIDB
};

// Compatibility for Local Preview
const StorageService = {
    getCurrentBoardId, setCurrentBoardId, getBoardsList, loadBoardsMetadata,
    createBoard, updateBoardMetadata, saveBoard, loadBoard, deleteBoard,
    saveViewportState, loadViewportState, loadBoardDataForSearch, emergencyLocalSave,
    saveUserSettings, loadUserSettings, updateUserSettings,
    getTrashBoards, restoreBoard, permanentlyDeleteBoard, cleanupExpiredTrash,
    saveImageToIDB, getImageFromIDB
};

if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
}
