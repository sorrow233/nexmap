import { useState, useEffect, useRef, useCallback } from 'react';
import { debugLog } from '../utils/debugLogger';

/**
 * useTabLock - Prevents data corruption by ensuring only one tab has 'MASTER' (Write) access
 * per boardId. Other tabs are 'READ_ONLY'.
 * 
 * Uses localStorage as the source of truth for lock ownership, and BroadcastChannel for notifications.
 * 
 * @param {string} boardId - The current board ID
 * @returns {{ isReadOnly: boolean, takeOverMaster: () => void }}
 */
export function useTabLock(boardId) {
    const [isReadOnly, setIsReadOnly] = useState(false);
    const tabId = useRef(Math.random().toString(36).substr(2, 9)).current;
    const channelRef = useRef(null);
    const heartbeatTimerRef = useRef(null);
    const monitoringTimerRef = useRef(null);

    const getLockKey = () => `nexmap_lock_${boardId}`;
    const HEARTBEAT_INTERVAL = 2000;
    const LOCK_TIMEOUT = 6000; // If no heartbeat for 6s, lock is stale

    // Check if current lock is still valid (not stale)
    const isLockValid = useCallback(() => {
        const lockKey = getLockKey();
        const lockData = localStorage.getItem(lockKey);
        if (!lockData) return false;

        try {
            const { tabId: lockTabId, timestamp } = JSON.parse(lockData);
            const age = Date.now() - timestamp;
            return age < LOCK_TIMEOUT && lockTabId;
        } catch {
            return false;
        }
    }, [boardId]);

    // Get current lock owner
    const getLockOwner = useCallback(() => {
        const lockKey = getLockKey();
        const lockData = localStorage.getItem(lockKey);
        if (!lockData) return null;

        try {
            const { tabId: lockTabId, timestamp } = JSON.parse(lockData);
            const age = Date.now() - timestamp;
            if (age >= LOCK_TIMEOUT) {
                // Stale lock, clear it
                localStorage.removeItem(lockKey);
                return null;
            }
            return lockTabId;
        } catch {
            return null;
        }
    }, [boardId]);

    // Attempt to acquire lock
    const acquireLock = useCallback(() => {
        const lockKey = getLockKey();
        const currentOwner = getLockOwner();

        // If I already own it, just refresh
        if (currentOwner === tabId) {
            localStorage.setItem(lockKey, JSON.stringify({ tabId, timestamp: Date.now() }));
            return true;
        }

        // If someone else owns it and lock is valid, I can't acquire
        if (currentOwner && currentOwner !== tabId) {
            return false;
        }

        // Lock is free or stale, acquire it
        localStorage.setItem(lockKey, JSON.stringify({ tabId, timestamp: Date.now() }));
        debugLog.sync(`[TabLock] Acquired lock for board: ${boardId} (Tab: ${tabId})`);
        return true;
    }, [boardId, getLockOwner, tabId]);

    // Release lock (only if I own it)
    const releaseLock = useCallback(() => {
        const lockKey = getLockKey();
        const currentOwner = getLockOwner();
        if (currentOwner === tabId) {
            localStorage.removeItem(lockKey);
            debugLog.sync(`[TabLock] Released lock for board: ${boardId} (Tab: ${tabId})`);
            // Notify other tabs
            channelRef.current?.postMessage({ type: 'LOCK_RELEASED', tabId });
        }
    }, [boardId, getLockOwner, tabId]);

    // Start heartbeat (master only)
    const startHeartbeat = useCallback(() => {
        if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = setInterval(() => {
            const lockKey = getLockKey();
            const currentOwner = getLockOwner();
            if (currentOwner === tabId) {
                // Refresh lock timestamp
                localStorage.setItem(lockKey, JSON.stringify({ tabId, timestamp: Date.now() }));
            }
        }, HEARTBEAT_INTERVAL);
    }, [getLockOwner, tabId, boardId]);

    // Start monitoring (follower only)
    const startMonitoring = useCallback(() => {
        if (monitoringTimerRef.current) clearInterval(monitoringTimerRef.current);
        monitoringTimerRef.current = setInterval(() => {
            const currentOwner = getLockOwner();
            if (!currentOwner) {
                // Lock is free or stale, try to acquire
                debugLog.sync(`[TabLock] Lock became available. Attempting to acquire...`);
                if (acquireLock()) {
                    setIsReadOnly(false);
                    startHeartbeat();
                    if (monitoringTimerRef.current) {
                        clearInterval(monitoringTimerRef.current);
                        monitoringTimerRef.current = null;
                    }
                    channelRef.current?.postMessage({ type: 'I_AM_MASTER', tabId });
                }
            } else if (currentOwner === tabId) {
                // I'm the master now
                setIsReadOnly(false);
            } else {
                // Someone else is master
                setIsReadOnly(true);
            }
        }, 2000);
    }, [getLockOwner, acquireLock, startHeartbeat, tabId]);

    // Manual takeover
    const takeOverMaster = useCallback(() => {
        debugLog.sync(`[TabLock] Manual takeover initiated for board: ${boardId} (Tab: ${tabId})`);
        const lockKey = getLockKey();
        localStorage.setItem(lockKey, JSON.stringify({ tabId, timestamp: Date.now() }));
        setIsReadOnly(false);
        startHeartbeat();
        if (monitoringTimerRef.current) {
            clearInterval(monitoringTimerRef.current);
            monitoringTimerRef.current = null;
        }
        channelRef.current?.postMessage({ type: 'TAKEOVER', tabId });
    }, [boardId, tabId, startHeartbeat]);

    useEffect(() => {
        if (!boardId || boardId.startsWith('sample-')) {
            setIsReadOnly(false);
            return;
        }

        // Initialize BroadcastChannel for notifications
        const channelName = `mixboard_lock_${boardId}`;
        const channel = new BroadcastChannel(channelName);
        channelRef.current = channel;

        // Handle messages from other tabs
        const handleMessage = (event) => {
            const { type, tabId: senderTabId } = event.data;

            if (type === 'I_AM_MASTER' || type === 'TAKEOVER') {
                if (senderTabId !== tabId) {
                    debugLog.sync(`[TabLock] Another tab claimed master: ${senderTabId}. I am READ_ONLY.`);
                    setIsReadOnly(true);
                    // Stop heartbeat if I was master
                    if (heartbeatTimerRef.current) {
                        clearInterval(heartbeatTimerRef.current);
                        heartbeatTimerRef.current = null;
                    }
                    startMonitoring();
                }
            } else if (type === 'LOCK_RELEASED') {
                if (senderTabId !== tabId) {
                    debugLog.sync(`[TabLock] Lock released by: ${senderTabId}. Attempting to acquire...`);
                    // Try to acquire immediately
                    if (acquireLock()) {
                        setIsReadOnly(false);
                        startHeartbeat();
                        if (monitoringTimerRef.current) {
                            clearInterval(monitoringTimerRef.current);
                            monitoringTimerRef.current = null;
                        }
                        channel.postMessage({ type: 'I_AM_MASTER', tabId });
                    }
                }
            }
        };

        channel.onmessage = handleMessage;

        // Initial lock acquisition attempt
        if (acquireLock()) {
            debugLog.sync(`[TabLock] I am MASTER for board: ${boardId} (Tab: ${tabId})`);
            setIsReadOnly(false);
            startHeartbeat();
            channel.postMessage({ type: 'I_AM_MASTER', tabId });
        } else {
            debugLog.sync(`[TabLock] Another tab is MASTER. I am READ_ONLY. (Tab: ${tabId})`);
            setIsReadOnly(true);
            startMonitoring();
        }

        // Cleanup on unmount
        return () => {
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
            if (monitoringTimerRef.current) clearInterval(monitoringTimerRef.current);
            releaseLock();
            channel.close();
            channelRef.current = null;
        };
    }, [boardId, acquireLock, startHeartbeat, startMonitoring, releaseLock, tabId]);

    // Handle page visibility changes - release lock when hidden, try to reacquire when visible
    useEffect(() => {
        if (!boardId || boardId.startsWith('sample-')) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Page is hidden, release lock to allow other tabs to take over
                // Only do this for extended hidden periods (we don't want to release on quick tab switches)
            } else {
                // Page is visible again, check lock status
                const currentOwner = getLockOwner();
                if (currentOwner === tabId) {
                    setIsReadOnly(false);
                } else if (!currentOwner) {
                    // Lock is free, try to acquire
                    if (acquireLock()) {
                        setIsReadOnly(false);
                        startHeartbeat();
                        channelRef.current?.postMessage({ type: 'I_AM_MASTER', tabId });
                    }
                } else {
                    setIsReadOnly(true);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [boardId, getLockOwner, acquireLock, startHeartbeat, tabId]);

    return { isReadOnly, takeOverMaster };
}

