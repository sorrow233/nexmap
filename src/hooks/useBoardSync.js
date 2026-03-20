import { useEffect, useRef, useState } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { listenForBoardPatches, listenForSingleBoard } from '../services/syncService';
import { useStore } from '../store/useStore';
import { debugLog } from '../utils/debugLogger';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../services/customInstructionsService';

/**
 * useBoardSync - 监听单个画板的云端实时同步
 * 
 * 核心设计思路：
 * - 每个标签页只监听自己当前打开的画板
 * - 避免多标签页同时写入共享存储造成冲突
 * - 配合 useTabLock 使用：只有 MASTER 标签才写入云端，
 *   READ_ONLY 标签仍然可以接收云端更新来保持显示同步
 * 
 * @param {string} boardId - 当前画板 ID
 * @param {boolean} isReadOnly - 是否为只读模式（从 useTabLock 获取）
 * @param {boolean} isBoardLoading - 当前画板是否处于初始加载阶段
 */
export function useBoardSync(boardId, isReadOnly = false, isBoardLoading = false) {
    const unsubRef = useRef(null);
    const [userId, setUserId] = useState(auth?.currentUser?.uid || null);
    const {
        setCards,
        setConnections,
        setGroups,
        setBoardPrompts,
        setBoardInstructionSettings,
        setActiveBoardPersistence
    } = useStore();
    const storeIsBoardLoading = useStore(state => state.isBoardLoading);

    // 监听 auth 状态变化
    useEffect(() => {
        if (!auth) return;

        const unsub = onAuthStateChanged(auth, (user) => {
            setUserId(user?.uid || null);
        });

        return () => unsub();
    }, []);

    useEffect(() => {
        // 清理之前的监听器
        if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
        }

        // 如果没有 boardId 或者是示例画板，不需要同步
        if (!boardId || boardId.startsWith('sample-')) {
            return;
        }

        // 避免与本地初始加载竞争，导致空状态误参与云合并
        if (isBoardLoading || storeIsBoardLoading) {
            debugLog.sync(`[BoardSync] Board ${boardId} is loading, postpone listener setup`);
            return;
        }

        // 如果用户未登录，不需要同步
        if (!userId) {
            debugLog.sync(`[BoardSync] No user logged in, skipping sync for ${boardId}`);
            return;
        }

        debugLog.sync(`[BoardSync] Starting sync for board: ${boardId} (ReadOnly: ${isReadOnly})`);

        const applyCloudUpdate = (updatedBoardId, data, source = 'snapshot') => {
            // 确保是当前画板的更新
            if (updatedBoardId !== boardId) {
                debugLog.sync(`[BoardSync] Ignoring update for different board: ${updatedBoardId}`);
                return;
            }

            debugLog.sync(`[BoardSync] Received ${source} update for ${boardId}`, {
                cards: data.cards?.length || 0,
                connections: data.connections?.length || 0,
                groups: data.groups?.length || 0,
                instructionSettings: !!data.boardInstructionSettings
            });

            // 更新 Store（使用 setCardsFromCloud 避免触发保存循环）
            if (data.cards) {
                const setCardsFromCloud = useStore.getState().setCardsFromCloud;
                if (setCardsFromCloud) {
                    setCardsFromCloud(data.cards);
                } else {
                    setCards(data.cards);
                }
            }
            if (data.connections) setConnections(data.connections);
            if (data.groups) setGroups(data.groups);
            if (data.boardPrompts) setBoardPrompts(data.boardPrompts);
            setBoardInstructionSettings(
                normalizeBoardInstructionSettings(
                    data.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
                )
            );
            setActiveBoardPersistence({
                updatedAt: data.updatedAt || 0,
                syncVersion: data.syncVersion || 0,
                clientRevision: data.clientRevision || 0,
                mutationSequence: data.mutationSequence || 0,
                dirty: false
            });

            debugLog.sync(`[BoardSync] State updated for board ${boardId} via ${source}`);
        };

        const unsubscribers = [];

        // 监听单画板快照更新（整板）
        unsubscribers.push(
            listenForSingleBoard(userId, boardId, (updatedBoardId, data) => {
                applyCloudUpdate(updatedBoardId, data, 'snapshot');
            })
        );

        const fromMutationSequence = useStore.getState()?.activeBoardPersistence?.mutationSequence || 0;
        // 监听增量 patch 更新（高频）
        unsubscribers.push(
            listenForBoardPatches(
                userId,
                boardId,
                (updatedBoardId, data) => {
                    applyCloudUpdate(updatedBoardId, data, 'patch');
                },
                { fromMutationSequence }
            )
        );

        unsubRef.current = () => {
            unsubscribers.forEach((unsubscribe) => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
        };

        return () => {
            if (unsubRef.current) {
                debugLog.sync(`[BoardSync] Cleaning up listener for board: ${boardId}`);
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, [boardId, userId, isReadOnly, isBoardLoading, storeIsBoardLoading, setCards, setConnections, setGroups, setBoardPrompts, setBoardInstructionSettings, setActiveBoardPersistence]);
}
