import { useEffect, useRef, useState } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { listenForSingleBoard } from '../services/syncService';
import { useStore } from '../store/useStore';
import { debugLog } from '../utils/debugLogger';

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
 */
export function useBoardSync(boardId, isReadOnly = false) {
    const unsubRef = useRef(null);
    const [userId, setUserId] = useState(auth?.currentUser?.uid || null);
    const { setCards, setConnections, setGroups, setBoardPrompts } = useStore();

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

        // 如果用户未登录，不需要同步
        if (!userId) {
            debugLog.sync(`[BoardSync] No user logged in, skipping sync for ${boardId}`);
            return;
        }

        debugLog.sync(`[BoardSync] Starting sync for board: ${boardId} (ReadOnly: ${isReadOnly})`);

        // 监听单画板更新
        unsubRef.current = listenForSingleBoard(userId, boardId, (updatedBoardId, data) => {
            // 确保是当前画板的更新
            if (updatedBoardId !== boardId) {
                debugLog.sync(`[BoardSync] Ignoring update for different board: ${updatedBoardId}`);
                return;
            }

            debugLog.sync(`[BoardSync] Received update for ${boardId}`, {
                cards: data.cards?.length || 0,
                connections: data.connections?.length || 0,
                groups: data.groups?.length || 0
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

            debugLog.sync(`[BoardSync] State updated for board ${boardId}`);
        });

        return () => {
            if (unsubRef.current) {
                debugLog.sync(`[BoardSync] Cleaning up listener for board: ${boardId}`);
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, [boardId, userId, isReadOnly, setCards, setConnections, setGroups, setBoardPrompts]);
}

