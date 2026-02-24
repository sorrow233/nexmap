import { db } from './firebase';
import { collection, doc, onSnapshot, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { idbGet } from './db/indexedDB';
import { saveBoard, getRawBoardsList } from './boardService';
import { debugLog } from '../utils/debugLogger';
import { reconcileCards, removeUndefined } from './syncUtils';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from './customInstructionsService';
import {
    handleTransientNetworkError,
    isLikelyNetworkError,
    setupFirestoreConnectivityMonitor
} from './syncNetworkGuard';

const BOARD_PREFIX = 'mixboard_board_';
const BOARDS_LIST_KEY = 'mixboard_boards_list';
setupFirestoreConnectivityMonitor(db);

const ensureArray = (value) => (Array.isArray(value) ? value : []);
const pickLocalArray = (storeValue, persistedValue) => {
    const storeArr = ensureArray(storeValue);
    const persistedArr = ensureArray(persistedValue);

    // Critical guard: avoid treating transient in-memory [] (during route load/reset)
    // as source of truth when persisted data exists.
    if (storeArr.length === 0 && persistedArr.length > 0) {
        return persistedArr;
    }
    return storeArr.length > 0 ? storeArr : persistedArr;
};

// Global quota error detection - intercept Firebase console errors
// This catches errors that happen at the connection level before onSnapshot callbacks
const originalConsoleError = console.error;
console.error = (...args) => {
    originalConsoleError.apply(console, args);
    // Check if this is a Firestore quota error
    const message = args.map(a => String(a)).join(' ');
    if (message.includes('resource-exhausted') || message.includes('Quota exceeded')) {
        const offlineMode = localStorage.getItem('mixboard_offline_mode');
        if (offlineMode !== 'true') {
            debugLog.sync('[GlobalErrorHandler] Detected quota error from Firebase, triggering offline mode');
            localStorage.setItem('mixboard_offline_mode', 'true');
            localStorage.setItem('mixboard_offline_auto', 'true');
            localStorage.setItem('mixboard_offline_time', Date.now().toString());
            // Trigger store update asynchronously
            import('../store/useStore').then(({ useStore }) => {
                useStore.getState().triggerAutoOffline?.();
            }).catch(() => { });
        }
    }
    if (isLikelyNetworkError(message)) {
        void handleTransientNetworkError(db, message, 'console.error');
    }
};

// Check if error is quota exhausted and trigger offline mode
const handleQuotaError = async (error, context) => {
    if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota exceeded')) {
        console.error(`[Sync] Quota exhausted during ${context}. Switching to offline mode.`);
        localStorage.setItem('mixboard_offline_mode', 'true');
        localStorage.setItem('mixboard_offline_auto', 'true'); // Mark as auto-triggered
        localStorage.setItem('mixboard_offline_time', Date.now().toString());
        try {
            const { useStore } = await import('../store/useStore');
            useStore.getState().triggerAutoOffline?.();
        } catch (e) {
            // Fallback handled above
        }
        return true;
    }
    return false;
};

const handleSyncError = (context, error) => {
    void handleQuotaError(error, context);
    if (isLikelyNetworkError(error)) {
        void handleTransientNetworkError(db, error, context);
        debugLog.warn(`${context} (temporary network issue)`, error);
        return;
    }
    debugLog.error(context, error);
};

// Check if offline mode is enabled
const isOfflineMode = () => {
    // If manually enabled, always respect it
    if (localStorage.getItem('mixboard_offline_mode') === 'true') {
        // Check if auto-triggered and enough time has passed (5 minutes)
        const isAuto = localStorage.getItem('mixboard_offline_auto') === 'true';
        const offlineTime = parseInt(localStorage.getItem('mixboard_offline_time') || '0', 10);
        const elapsed = Date.now() - offlineTime;

        // Auto-triggered offline mode expires after 5 minutes - allow retry
        if (isAuto && elapsed > 5 * 60 * 1000) {
            debugLog.sync('Auto-offline expired (5 min), allowing sync retry...');
            return false; // Allow one sync attempt
        }
        return true;
    }
    return false;
};

// Called when sync succeeds - clear auto-offline state
const onSyncSuccess = () => {
    if (localStorage.getItem('mixboard_offline_auto') === 'true') {
        debugLog.sync('Sync succeeded! Clearing auto-offline mode.');
        localStorage.removeItem('mixboard_offline_mode');
        localStorage.removeItem('mixboard_offline_auto');
        localStorage.removeItem('mixboard_offline_time');
        localStorage.removeItem('mixboard_offline_reason');
        // Update store if available
        import('../store/useStore').then(({ useStore }) => {
            useStore.getState().setOfflineMode?.(false);
        }).catch(() => { });
    }
};

/**
 * 监听用户所有画板的元数据变化（用于 Gallery 列表）
 * 注意：这个监听器只更新画板列表，不触发画板内容的 rehydration
 */
export const listenForBoardsMetadata = (userId, onUpdate) => {
    if (!db || !userId) return () => { };

    try {
        debugLog.sync('Initializing Firestore listener for boards METADATA + BACKGROUND CACHE');
        const boardsRef = collection(db, 'users', userId, 'boards');
        return onSnapshot(boardsRef, async (snapshot) => {
            debugLog.sync(`[Metadata] Snapshot received: ${snapshot.size} docs, ${snapshot.docChanges().length} changes`);

            // Background hydration: Update IDB for changed boards to keep search/notes indexed
            const changeTasks = snapshot.docChanges().map(async (change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    const boardData = change.doc.data();
                    if (!boardData?.id) return;

                    try {
                        // Use basic sync check to avoid redundant IDB writes
                        const boardId = boardData.id;
                        const localData = await idbGet(BOARD_PREFIX + boardId);

                        const cloudVersion = boardData.syncVersion || 0;
                        const localVersion = localData?.syncVersion || 0;
                        const cloudUpdated = boardData.updatedAt || 0;
                        const localUpdated = localData?.updatedAt || 0;

                        // Only update IDB if cloud version is actually newer
                        if (!localData || cloudVersion > localVersion || (cloudVersion === 0 && cloudUpdated > localUpdated)) {
                            // We use saveBoard from boardService but since it updates localStorage list meta too, 
                            // we'll be careful to avoid race conditions with the setBoardsList call below.
                            // Actually, saveBoard is safe to call here as a background sync.
                            await saveBoard(boardId, {
                                cards: boardData.cards || [],
                                connections: boardData.connections || [],
                                groups: boardData.groups || [],
                                boardPrompts: boardData.boardPrompts || [],
                                boardInstructionSettings: normalizeBoardInstructionSettings(
                                    boardData.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
                                ),
                                updatedAt: boardData.updatedAt,
                                syncVersion: boardData.syncVersion
                            });
                        }
                    } catch (e) {
                        debugLog.error(`[BackgroundSync] Failed for ${boardData.id}`, e);
                    }
                }
            });

            // Process metadata list for UI
            const allBoards = snapshot.docs.map(doc => doc.data()).filter(b => b && b.id);

            // Get existing localStorage data to preserve local-only fields like 'summary'
            const existingLocalBoards = getRawBoardsList();

            const metadataList = allBoards.map(b => {
                const idAsTimestamp = parseInt(b.id, 10);
                const recoveredCreatedAt = (!isNaN(idAsTimestamp) && idAsTimestamp > 1000000000000) ? idAsTimestamp : null;
                const existingLocal = existingLocalBoards.find(lb => lb.id === b.id);
                const summaryToUse = b.summary || existingLocal?.summary;

                return {
                    id: b.id,
                    name: b.name || 'Untitled',
                    createdAt: b.createdAt || recoveredCreatedAt || b.updatedAt || 0,
                    updatedAt: b.updatedAt || recoveredCreatedAt || 0,
                    lastAccessedAt: b.lastAccessedAt || b.updatedAt || recoveredCreatedAt || 0,
                    cardCount: b.cards?.length || 0,
                    deletedAt: b.deletedAt,
                    backgroundImage: b.backgroundImage,
                    summary: summaryToUse
                };
            }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(metadataList));
            onUpdate(metadataList);

            // Ensure background sync completes
            if (changeTasks.length > 0) {
                Promise.all(changeTasks).then(() => {
                    debugLog.sync(`[BackgroundSync] Finished processing ${changeTasks.length} changes`);
                });
            }
        }, (error) => {
            handleSyncError('Firestore metadata sync error:', error);
        });
    } catch (err) {

        debugLog.error("listenForBoardsMetadata fatal error:", err);
        return () => { };
    }
};

/**
 * 监听单个画板的内容变化（用于当前活跃画板的实时同步）
 * 每个标签页只监听自己当前打开的画板，避免多标签页冲突
 */
export const listenForSingleBoard = (userId, boardId, onUpdate) => {
    if (!db || !userId || !boardId || boardId.startsWith('sample-')) {
        return () => { };
    }

    try {
        debugLog.sync(`[SingleBoard] Starting listener for board: ${boardId}`);
        const boardRef = doc(db, 'users', userId, 'boards', boardId);

        return onSnapshot(boardRef, async (docSnap) => {
            if (!docSnap.exists()) {
                debugLog.sync(`[SingleBoard] Board ${boardId} does not exist in cloud`);
                return;
            }

            const boardData = docSnap.data();
            debugLog.sync(`[SingleBoard] Update received for ${boardId}`, {
                cloudCards: (boardData.cards || []).length,
                cloudVersion: boardData.syncVersion || 0
            });

            try {
                const localData = await idbGet(BOARD_PREFIX + boardId);

                // Get state for immediate comparison
                const { useStore } = await import('../store/useStore');
                const store = useStore.getState();
                const activeBoardId = sessionStorage.getItem('mixboard_current_board_id');
                const canTrustStoreState = activeBoardId === boardId && !store.isBoardLoading;

                const localCards = canTrustStoreState
                    ? pickLocalArray(store.cards, localData?.cards)
                    : ensureArray(localData?.cards);
                const localConnections = canTrustStoreState
                    ? pickLocalArray(store.connections, localData?.connections)
                    : ensureArray(localData?.connections);
                const localGroups = canTrustStoreState
                    ? pickLocalArray(store.groups, localData?.groups)
                    : ensureArray(localData?.groups);
                const localBoardPrompts = canTrustStoreState
                    ? pickLocalArray(store.boardPrompts, localData?.boardPrompts)
                    : ensureArray(localData?.boardPrompts);
                const localBoardInstructionSettings = canTrustStoreState
                    ? (store.boardInstructionSettings || localData?.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS)
                    : (localData?.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS);
                const localUpdatedAt = canTrustStoreState
                    ? Math.max(store.lastSavedAt || 0, localData?.updatedAt || 0)
                    : (localData?.updatedAt || 0);

                const localVersion = localData?.syncVersion || 0;
                const cloudVersion = boardData.syncVersion || 0;

                // Use syncVersion for conflict detection
                if (localData && cloudVersion > 0 && localVersion > 0) {
                    if (localVersion >= cloudVersion) {
                        debugLog.sync(`[SingleBoard] Skipping: local version ${localVersion} >= cloud ${cloudVersion}`);
                        return;
                    }
                } else if (localData && boardData.updatedAt && localUpdatedAt >= boardData.updatedAt) {
                    debugLog.sync(`[SingleBoard] Skipping: local timestamp is up-to-date`);
                    return;
                }

                if (!localCards || localCards.length === 0) {
                    debugLog.sync(`[SingleBoard] No local cards, using cloud data directly`);
                    await saveBoard(boardId, {
                        cards: boardData.cards || [],
                        connections: boardData.connections || [],
                        groups: boardData.groups || [],
                        boardPrompts: boardData.boardPrompts || [],
                        boardInstructionSettings: normalizeBoardInstructionSettings(
                            boardData.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
                        ),
                        updatedAt: boardData.updatedAt
                    });
                    onUpdate(boardId, {
                        cards: boardData.cards || [],
                        connections: boardData.connections || [],
                        groups: boardData.groups || [],
                        boardPrompts: boardData.boardPrompts || [],
                        boardInstructionSettings: normalizeBoardInstructionSettings(
                            boardData.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
                        )
                    });
                    return;
                }

                // Reconcile cards
                const finalCards = reconcileCards(
                    boardData.cards || [],
                    localCards,
                    localVersion,
                    cloudVersion,
                    localUpdatedAt,
                    boardData.updatedAt || 0
                );

                debugLog.sync(`[SingleBoard] Merge result: ${localCards.length} local + ${(boardData.cards || []).length} cloud = ${finalCards.length} final`);

                const mergedData = {
                    cards: finalCards,
                    connections: boardData.connections || localConnections,
                    groups: boardData.groups !== undefined ? boardData.groups : (localGroups || []),
                    boardPrompts: boardData.boardPrompts !== undefined ? boardData.boardPrompts : (localBoardPrompts || []),
                    boardInstructionSettings: boardData.boardInstructionSettings !== undefined
                        ? normalizeBoardInstructionSettings(boardData.boardInstructionSettings)
                        : normalizeBoardInstructionSettings(localBoardInstructionSettings),
                    updatedAt: boardData.updatedAt
                };

                await saveBoard(boardId, mergedData);
                onUpdate(boardId, mergedData);

            } catch (e) {
                debugLog.error(`[SingleBoard] Merge failed for board ${boardId}`, e);
            }
        }, (error) => {
            handleSyncError(`[SingleBoard] Sync error for ${boardId}:`, error);
        });

    } catch (err) {
        debugLog.error(`listenForSingleBoard fatal error for ${boardId}:`, err);
        return () => { };
    }
};

/**
 * @deprecated Use listenForBoardsMetadata + listenForSingleBoard instead
 * 保留用于向后兼容，但不推荐使用
 */
export const listenForBoardUpdates = (userId, onUpdate) => {
    if (!db || !userId) return () => { };

    try {
        debugLog.sync('[DEPRECATED] Using listenForBoardUpdates - consider switching to listenForBoardsMetadata + listenForSingleBoard');
        const boardsRef = collection(db, 'users', userId, 'boards');
        return onSnapshot(boardsRef, async (snapshot) => {
            const promises = [];
            let hasChanges = false;

            debugLog.sync(`Firestore snapshot received: ${snapshot.size} docs, ${snapshot.docChanges().length} changes`);

            for (const change of snapshot.docChanges()) {
                const boardData = change.doc.data();
                if (!boardData.id) continue;

                if (change.type === 'added' || change.type === 'modified') {
                    promises.push((async () => {
                        try {
                            const localData = await idbGet(BOARD_PREFIX + boardData.id);

                            // Get state for immediate comparison if it's the active board
                            const { useStore } = await import('../store/useStore');
                            const store = useStore.getState();
                            const currentActiveId = sessionStorage.getItem('mixboard_current_board_id');
                            const canTrustStoreState = boardData.id === currentActiveId && !store.isBoardLoading;

                            const localCards = canTrustStoreState
                                ? pickLocalArray(store.cards, localData?.cards)
                                : ensureArray(localData?.cards);
                            const localConnections = canTrustStoreState
                                ? pickLocalArray(store.connections, localData?.connections)
                                : ensureArray(localData?.connections);
                            const localGroups = canTrustStoreState
                                ? pickLocalArray(store.groups, localData?.groups)
                                : ensureArray(localData?.groups);
                            const localBoardPrompts = canTrustStoreState
                                ? pickLocalArray(store.boardPrompts, localData?.boardPrompts)
                                : ensureArray(localData?.boardPrompts);
                            const localBoardInstructionSettings = canTrustStoreState
                                ? (store.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS)
                                : (localData?.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS);
                            const localUpdatedAt = canTrustStoreState
                                ? Math.max(store.lastSavedAt || 0, localData?.updatedAt || 0)
                                : (localData?.updatedAt || 0);

                            // Use syncVersion (logical clock) for conflict detection, fallback to updatedAt for backward compatibility
                            const localVersion = localData?.syncVersion || 0;
                            const cloudVersion = boardData.syncVersion || 0;

                            // If both have syncVersion, use it; otherwise fall back to timestamp comparison
                            if (localData && cloudVersion > 0 && localVersion > 0) {
                                if (localVersion >= cloudVersion) {
                                    debugLog.sync(`Skipping cloud update for ${boardData.id}: local syncVersion ${localVersion} >= cloud ${cloudVersion}`);
                                    return;
                                }
                            } else if (localData && boardData.updatedAt && localUpdatedAt >= boardData.updatedAt) {
                                // Backward compatibility: use timestamp if no syncVersion
                                debugLog.sync(`Skipping cloud update for ${boardData.id}: local version is up-to-date (timestamp fallback)`);
                                return;
                            }

                            debugLog.sync(`Merging cloud updates for board: ${boardData.id}`, {
                                type: change.type,
                                cloudCards: (boardData.cards || []).length,
                                localCards: localCards.length,
                                isCurrentBoard: canTrustStoreState
                            });
                            hasChanges = true;

                            if (!localCards || localCards.length === 0) {
                                debugLog.sync(`Board ${boardData.id} has no local cards, using cloud data directly (${(boardData.cards || []).length} cards)`);
                                await saveBoard(boardData.id, {
                                    cards: boardData.cards || [],
                                    connections: boardData.connections || [],
                                    groups: boardData.groups || [],
                                    boardPrompts: boardData.boardPrompts || [],
                                    boardInstructionSettings: normalizeBoardInstructionSettings(
                                        boardData.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
                                    ),
                                    updatedAt: boardData.updatedAt
                                });
                                return;
                            }

                            // Robust Merge with Deletion Reconciliation
                            // Pass syncVersion for more reliable conflict detection
                            const finalCards = reconcileCards(
                                boardData.cards || [],
                                localCards,
                                localVersion,
                                cloudVersion,
                                localUpdatedAt,
                                boardData.updatedAt || 0
                            );

                            // Log the merge result for debugging
                            debugLog.sync(`Board ${boardData.id} merge result: ${localCards.length} local + ${(boardData.cards || []).length} cloud = ${finalCards.length} final`);

                            await saveBoard(boardData.id, {
                                cards: finalCards,
                                connections: boardData.connections || localConnections || [],
                                groups: boardData.groups !== undefined ? boardData.groups : (localGroups || []),
                                boardPrompts: boardData.boardPrompts !== undefined ? boardData.boardPrompts : (localBoardPrompts || []),
                                boardInstructionSettings: boardData.boardInstructionSettings !== undefined
                                    ? normalizeBoardInstructionSettings(boardData.boardInstructionSettings)
                                    : normalizeBoardInstructionSettings(localBoardInstructionSettings),
                                updatedAt: boardData.updatedAt
                            });
                        } catch (e) {
                            debugLog.error(`[Firebase Sync] Merge failed for board ${boardData.id}`, e);
                        }
                    })());
                } else if (change.type === 'removed') {
                    debugLog.sync(`Board removed in cloud: ${boardData.id}`);
                }
            }

            if (promises.length > 0) {
                await Promise.all(promises);
                if (hasChanges) debugLog.sync(`Hydration complete for ${promises.length} board(s)`);
            }

            // Sync Metadata List - FILTER OUT INVALID DOCS (no id or name)
            const allBoards = snapshot.docs.map(doc => doc.data()).filter(b => b && b.id);

            // Get existing localStorage data to preserve local-only fields like 'summary'
            const existingLocalBoards = getRawBoardsList();

            const metadataList = allBoards.map(b => {
                // CRITICAL FIX: Recover createdAt from board ID (timestamp-based) if missing
                // Board IDs are generated with Date.now().toString(), so we can extract the original creation time
                const idAsTimestamp = parseInt(b.id, 10);
                const recoveredCreatedAt = (!isNaN(idAsTimestamp) && idAsTimestamp > 1000000000000) ? idAsTimestamp : null;

                // Preserve local summary if cloud doesn't have it
                const existingLocal = existingLocalBoards.find(lb => lb.id === b.id);
                const summaryToUse = b.summary || existingLocal?.summary;

                return {
                    id: b.id,
                    name: b.name || 'Untitled',
                    // Prefer explicit createdAt, then recover from ID, lastly use updatedAt (NOT Date.now())
                    createdAt: b.createdAt || recoveredCreatedAt || b.updatedAt || 0,
                    updatedAt: b.updatedAt || recoveredCreatedAt || 0,
                    lastAccessedAt: b.lastAccessedAt || b.updatedAt || recoveredCreatedAt || 0,
                    cardCount: b.cards?.length || 0,
                    deletedAt: b.deletedAt,
                    backgroundImage: b.backgroundImage,
                    summary: summaryToUse // CRITICAL: Preserve summary field
                };
            }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(metadataList));
            onUpdate(metadataList, snapshot.docChanges().map(c => c.doc.data().id));
        }, (error) => {
            handleSyncError('Firestore sync error:', error);
        });
    } catch (err) {
        debugLog.error("listenForBoardUpdates fatal error:", err);
        return () => { };
    }
};

// Content hash cache to avoid redundant writes
const lastSyncedContentHash = new Map();

export const saveBoardToCloud = async (userId, boardId, boardContent) => {
    if (!db || !userId) return;

    // Skip cloud sync in offline mode
    if (isOfflineMode()) {
        debugLog.sync(`Skipping cloud save for ${boardId}: offline mode enabled`);
        return;
    }

    // Generate content hash for dirty checking
    const contentHash = JSON.stringify({
        cards: (boardContent.cards || []).map(c => ({
            id: c.id,
            x: c.x,
            y: c.y,
            type: c.type,
            data: c.data
        })),
        connections: boardContent.connections || [],
        groups: boardContent.groups || [],
        boardPrompts: boardContent.boardPrompts || [],
        boardInstructionSettings: normalizeBoardInstructionSettings(
            boardContent.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
        )
    });

    const cacheKey = `${userId}:${boardId}`;
    if (lastSyncedContentHash.get(cacheKey) === contentHash) {
        debugLog.sync(`Skipping cloud save for ${boardId}: content unchanged`);
        return;
    }

    try {
        debugLog.sync(`Saving board ${boardId} to cloud...`);
        const list = getRawBoardsList();
        const meta = list.find(b => b.id === boardId);

        if (!meta) {
            debugLog.error(`Metadata not found for board ${boardId}, cloud save aborted.`);
            return;
        }



        const cleanedContent = {
            cards: (boardContent.cards || []).map(card => ({
                ...card,
                data: {
                    ...card.data,
                    messages: (card.data?.messages || []).map(msg => {
                        if (Array.isArray(msg.content)) {
                            return {
                                ...msg,
                                content: msg.content.map(part => {
                                    if (part.type === 'image' && part.source) {
                                        if (part.source.s3Url) {
                                            return {
                                                type: 'image',
                                                source: {
                                                    type: 'url',
                                                    media_type: part.source.media_type,
                                                    url: part.source.s3Url
                                                }
                                            };
                                        }
                                        if (part.source.type === 'base64' && !part.source.s3Url) {
                                            return null;
                                        }
                                    }
                                    return part;
                                }).filter(Boolean)
                            };
                        }
                        return msg;
                    })
                }
            })),
            connections: boardContent.connections || [],
            groups: boardContent.groups || [],
            boardPrompts: boardContent.boardPrompts || [],
            boardInstructionSettings: normalizeBoardInstructionSettings(
                boardContent.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
            )
        };

        // Increment syncVersion (logical clock) for conflict resolution
        const newSyncVersion = (meta.syncVersion || 0) + 1;

        const fullBoard = removeUndefined({
            ...meta,
            ...cleanedContent,
            updatedAt: Date.now(), // Keep for UI display
            syncVersion: newSyncVersion // Logical clock for conflict detection
        });

        // Use serverTimestamp for authoritative server time
        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await setDoc(boardRef, { ...fullBoard, serverUpdatedAt: serverTimestamp() });

        // Cache successful sync
        lastSyncedContentHash.set(cacheKey, contentHash);
        onSyncSuccess(); // Clear auto-offline if was triggered
        debugLog.sync(`Board ${boardId} cloud save successful (syncVersion: ${newSyncVersion})`);
    } catch (e) {
        handleSyncError(`Cloud save failed for board ${boardId}`, e);
    }
};

export const updateBoardMetadataInCloud = async (userId, boardId, metadata) => {
    if (!db || !userId || isOfflineMode()) return;
    try {
        debugLog.sync(`Updating cloud metadata for board ${boardId}`, metadata);
        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await setDoc(boardRef, metadata, { merge: true });
    } catch (e) {
        handleSyncError(`Cloud metadata update failed for board ${boardId}`, e);
    }
};

export const deleteBoardFromCloud = async (userId, boardId) => {
    if (!db || !userId) return;
    try {
        debugLog.sync(`Deleting board ${boardId} from cloud`);
        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await deleteDoc(boardRef);
    } catch (e) {
        debugLog.error(`Cloud delete failed for board ${boardId}`, e);
    }
};

export const saveUserSettings = async (userId, settings) => {
    if (!db || !userId) return { ok: false, reason: 'missing_context' };
    if (isOfflineMode()) {
        debugLog.sync('Skipped saveUserSettings because offline mode is enabled');
        return { ok: false, reason: 'offline_mode' };
    }
    try {
        debugLog.auth('Saving user settings to cloud...', settings);
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        await setDoc(configRef, settings);
        return { ok: true };
    } catch (e) {
        handleSyncError('Save settings failed', e);
        return { ok: false, reason: 'error', error: e };
    }
};

export const updateUserSettings = async (userId, updates) => {
    if (!db || !userId) return { ok: false, reason: 'missing_context' };
    if (isOfflineMode()) {
        debugLog.sync('Skipped updateUserSettings because offline mode is enabled');
        return { ok: false, reason: 'offline_mode' };
    }
    try {
        debugLog.auth('Updating user settings in cloud...', updates);

        // Process timestamp flags: if xxxModified: true, replace with serverTimestamp()
        const processedUpdates = { ...updates };
        if (processedUpdates.customInstructionsModified === true) {
            delete processedUpdates.customInstructionsModified;
            processedUpdates.customInstructionsModifiedAt = serverTimestamp();
        }
        if (processedUpdates.globalPromptsModified === true) {
            delete processedUpdates.globalPromptsModified;
            processedUpdates.globalPromptsModifiedAt = serverTimestamp();
        }
        if (processedUpdates.userLanguageModified === true) {
            delete processedUpdates.userLanguageModified;
            processedUpdates.userLanguageModifiedAt = serverTimestamp();
        }

        const configRef = doc(db, 'users', userId, 'settings', 'config');

        // Use a more predictable timestamp for settings logic 
        // because we use it for conflict resolution comparison in useAppInit.
        if (processedUpdates.lastUpdated === undefined) {
            processedUpdates.lastUpdated = Date.now();
        }

        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
            // updateDoc DOES NOT do deep-merging of maps, it replaces the field.
            // This is critical for deleting providers.
            await updateDoc(configRef, processedUpdates);
        } else {
            // First time setup
            await setDoc(configRef, processedUpdates);
        }
        return { ok: true };
    } catch (e) {
        handleSyncError('Update settings failed', e);
        return { ok: false, reason: 'error', error: e };
    }
};

export const loadUserSettings = async (userId) => {
    if (!db || !userId) return null;
    try {
        debugLog.auth('Loading user settings from cloud');
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        const docSnap = await getDoc(configRef);
        const data = docSnap.exists() ? docSnap.data() : null;
        debugLog.auth(data ? 'Settings loaded' : 'No cloud settings found');
        return data;
    } catch (e) {
        debugLog.error("Load settings failed", e);
        return null;
    }
};

export const listenForUserSettings = (userId, onUpdate) => {
    if (!db || !userId || typeof onUpdate !== 'function') return () => { };
    try {
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        return onSnapshot(configRef, (docSnap) => {
            const data = docSnap.exists() ? docSnap.data() : null;
            onUpdate(data);
        }, (error) => {
            handleSyncError('Firestore user settings listener error:', error);
        });
    } catch (err) {
        debugLog.error('listenForUserSettings error:', err);
        return () => { };
    }
};

// --- Favorites Sync ---

export const listenForFavoriteUpdates = (userId, onUpdate) => {
    if (!db || !userId) return () => { };

    try {
        debugLog.sync('Initializing Firestore listener for user favorites');
        const favoritesRef = collection(db, 'users', userId, 'favorites');
        return onSnapshot(favoritesRef, (snapshot) => {
            const changes = [];

            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                // Ensure ID is present
                if (!data.id) return;

                if (change.type === 'added' || change.type === 'modified') {
                    changes.push(data);
                } else if (change.type === 'removed') {
                    changes.push({ id: data.id, _deleted: true });
                }
            });

            if (changes.length > 0) {
                debugLog.sync(`Received ${changes.length} favorite updates from cloud`);
                onUpdate(changes);
            }
        }, (error) => {
            handleSyncError('Firestore favorites sync error:', error);
        });
    } catch (err) {
        debugLog.error("listenForFavoriteUpdates error:", err);
        return () => { };
    }
};

export const saveFavoriteToCloud = async (userId, favorite) => {
    if (!db || !userId || !favorite || !favorite.id) return;
    try {
        // debugLog.sync(`Saving favorite ${favorite.id} to cloud`);
        const favRef = doc(db, 'users', userId, 'favorites', favorite.id);
        await setDoc(favRef, { ...favorite, updatedAt: serverTimestamp() });
    } catch (e) {
        debugLog.error(`Cloud save failed for favorite ${favorite.id}`, e);
    }
};

export const deleteFavoriteFromCloud = async (userId, favoriteId) => {
    if (!db || !userId) return;
    try {
        debugLog.sync(`Deleting favorite ${favoriteId} from cloud`);
        const favRef = doc(db, 'users', userId, 'favorites', favoriteId);
        await deleteDoc(favRef);
    } catch (e) {
        debugLog.error(`Cloud delete failed for favorite ${favoriteId}`, e);
    }
};
