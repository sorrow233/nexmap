import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';

const EMPTY_PENDING_MESSAGES = [];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isCardBusy = (cardId) => {
    const state = useStore.getState();
    return (state.generatingCardTaskCounts?.[cardId] || 0) > 0 || state.generatingCardIds.has(cardId);
};

export function usePendingMessageQueue({
    cardId,
    isReadOnly = false,
    isCardGenerating = false,
    onDispatch,
    onBeforeDispatch
}) {
    const pendingMessages = useStore((state) => state.pendingMessages[cardId] || EMPTY_PENDING_MESSAGES);
    const addPendingMessage = useStore((state) => state.addPendingMessage);
    const prependPendingMessage = useStore((state) => state.prependPendingMessage);
    const popPendingMessage = useStore((state) => state.popPendingMessage);
    const clearPendingMessages = useStore((state) => state.clearPendingMessages);

    const [isQueueRunning, setIsQueueRunning] = useState(false);
    const [isDispatching, setIsDispatching] = useState(false);
    const queueWorkerActiveRef = useRef(false);
    const queueRunIdRef = useRef(0);
    const isMountedRef = useRef(true);
    const directDispatchActiveRef = useRef(false);

    const pendingCount = pendingMessages.length;

    const waitForCardIdle = useCallback(async (runId) => {
        while (queueRunIdRef.current === runId && isCardBusy(cardId)) {
            await delay(120);
        }
    }, [cardId]);

    const runQueueWorker = useCallback(async (runId) => {
        while (queueRunIdRef.current === runId) {
            await waitForCardIdle(runId);
            if (queueRunIdRef.current !== runId) break;

            const nextMsg = popPendingMessage(cardId);
            if (!nextMsg) break;

            onBeforeDispatch?.(nextMsg);

            try {
                await onDispatch(nextMsg.text || '', nextMsg.images || []);
            } catch (error) {
                console.error('[PendingMessageQueue] Failed to dispatch queued message:', error);
                prependPendingMessage(cardId, nextMsg.text || '', nextMsg.images || []);
                break;
            }
        }
    }, [cardId, onBeforeDispatch, onDispatch, popPendingMessage, prependPendingMessage, waitForCardIdle]);

    const startQueueWorker = useCallback(() => {
        if (isReadOnly || queueWorkerActiveRef.current) return;

        const runId = queueRunIdRef.current + 1;
        queueRunIdRef.current = runId;
        queueWorkerActiveRef.current = true;

        if (isMountedRef.current) {
            setIsQueueRunning(true);
        }

        runQueueWorker(runId).finally(() => {
            if (queueRunIdRef.current !== runId) return;
            queueWorkerActiveRef.current = false;
            if (isMountedRef.current) {
                setIsQueueRunning(false);
            }
        });
    }, [isReadOnly, runQueueWorker]);

    const enqueueMessage = useCallback((text, images = []) => {
        if (isReadOnly) return;
        addPendingMessage(cardId, text, images);
        startQueueWorker();
    }, [addPendingMessage, cardId, isReadOnly, startQueueWorker]);

    const sendMessage = useCallback((text, images = []) => {
        if (isReadOnly) return;

        const shouldQueue =
            isCardGenerating ||
            queueWorkerActiveRef.current ||
            directDispatchActiveRef.current ||
            pendingCount > 0;
        if (shouldQueue) {
            enqueueMessage(text, images);
            return;
        }

        directDispatchActiveRef.current = true;
        if (isMountedRef.current) {
            setIsDispatching(true);
        }
        onBeforeDispatch?.({ text, images });
        Promise.resolve(onDispatch(text, images)).finally(() => {
            directDispatchActiveRef.current = false;
            if (isMountedRef.current) {
                setIsDispatching(false);
            }
        });
    }, [enqueueMessage, isCardGenerating, isReadOnly, onBeforeDispatch, onDispatch, pendingCount]);

    const resetQueue = useCallback(() => {
        queueRunIdRef.current += 1;
        queueWorkerActiveRef.current = false;
        directDispatchActiveRef.current = false;
        setIsDispatching(false);
        setIsQueueRunning(false);
        clearPendingMessages(cardId);
    }, [cardId, clearPendingMessages]);

    useEffect(() => {
        if (isReadOnly) return;
        if (pendingCount > 0) {
            startQueueWorker();
        }
    }, [isReadOnly, pendingCount, startQueueWorker]);

    useEffect(() => {
        queueRunIdRef.current += 1;
        queueWorkerActiveRef.current = false;
        directDispatchActiveRef.current = false;
        setIsDispatching(false);
        setIsQueueRunning(false);
    }, [cardId]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            queueRunIdRef.current += 1;
            queueWorkerActiveRef.current = false;
            directDispatchActiveRef.current = false;
        };
    }, []);

    return {
        isDispatching,
        isQueueRunning,
        pendingMessages,
        pendingCount,
        resetQueue,
        sendMessage
    };
}
