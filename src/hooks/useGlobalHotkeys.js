import { useCallback, useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useStore, undo, redo } from '../store/useStore';
import { uuid } from '../utils/uuid';
import {
    readCardClipboardForPasteAsync,
    stripCardRuntimeBodyState,
    writeCardClipboard
} from '../services/cardClipboardService';
import { getCurrentBoardId } from '../services/storage';
import { isCardPasteTargetReady } from '../services/cardPasteCoordinator';
import { buildPastedCardBatch } from '../utils/cardPasteLayout';

export function useGlobalHotkeys({ boardId = '', isReadOnly = false } = {}) {
    const isBoardLoading = useStore((state) => state.isBoardLoading);
    const pendingPasteBoardIdRef = useRef('');
    const pasteInFlightRef = useRef(false);

    const isTargetBoardReady = useCallback(() => isCardPasteTargetReady({
        targetBoardId: boardId,
        activeBoardId: getCurrentBoardId() || '',
        isBoardLoading: useStore.getState().isBoardLoading,
        isReadOnly
    }), [boardId, isReadOnly]);

    // Helper for Copy
    const handleCopy = useCallback(async () => {
        const { selectedIds, getCardsByIds } = useStore.getState();
        if (selectedIds.length === 0) return;
        const selectedCards = typeof getCardsByIds === 'function'
            ? getCardsByIds(selectedIds)
            : [];
        const clipboardCards = selectedCards.map((card) => stripCardRuntimeBodyState(card));
        writeCardClipboard(clipboardCards, { sourceBoardId: boardId });
        try {
            const textContent = clipboardCards.map(c => {
                const messages = Array.isArray(c?.data?.messages) ? c.data.messages : [];
                const lastMsg = messages[messages.length - 1];
                return lastMsg ? lastMsg.content : '';
            }).join('\n\n---\n\n');
            if (textContent) await navigator.clipboard.writeText(textContent);
        } catch (e) { console.error(e); }
    }, [boardId]);

    // Helper for Paste
    const handlePaste = useCallback(async () => {
        if (isReadOnly) return;
        if (!isTargetBoardReady()) {
            pendingPasteBoardIdRef.current = boardId;
            return;
        }
        if (pasteInFlightRef.current) return;

        pasteInFlightRef.current = true;
        try {
            const clipboardPayload = await readCardClipboardForPasteAsync();
            if (!clipboardPayload) return;
            if (!isTargetBoardReady()) {
                pendingPasteBoardIdRef.current = boardId;
                return;
            }

            const {
                offset,
                scale,
                setCards,
                setSelectedIds
            } = useStore.getState();
            const newCards = buildPastedCardBatch({
                clipboardCards: clipboardPayload.cards,
                offset,
                scale,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                currentPasteSequence: clipboardPayload.pasteSequence,
                createId: uuid
            });
            if (newCards.length === 0) return;
            setCards((currentCards) => [...currentCards, ...newCards], {
                changeType: 'card_add',
                reason: 'handlePaste'
            });
            setSelectedIds(newCards.map(c => c.id));
        } finally {
            pasteInFlightRef.current = false;
        }
    }, [boardId, isReadOnly, isTargetBoardReady]);

    useEffect(() => {
        if (
            isReadOnly
            || isBoardLoading
            || pendingPasteBoardIdRef.current !== boardId
            || !isTargetBoardReady()
        ) {
            return;
        }

        pendingPasteBoardIdRef.current = '';
        void handlePaste();
    }, [boardId, handlePaste, isBoardLoading, isReadOnly, isTargetBoardReady]);

    // Delete / Backspace
    useHotkeys('delete, backspace', () => {
        const { selectedIds, handleBatchDelete } = useStore.getState();
        if (selectedIds.length > 0) handleBatchDelete();
    }, []);

    // R -> Regenerate (with input field protection)
    useHotkeys('r', () => {
        const activeEl = document.activeElement;
        const isEditing = activeEl?.tagName === 'INPUT' ||
            activeEl?.tagName === 'TEXTAREA' ||
            activeEl?.isContentEditable;
        if (isEditing) return;
        const { selectedIds, handleRegenerate } = useStore.getState();
        if (selectedIds.length > 0) handleRegenerate();
    }, []);

    // L -> Link
    useHotkeys('l', () => {
        const {
            selectedIds,
            connections,
            handleConnect,
            setConnections
        } = useStore.getState();
        if (selectedIds.length > 1) {
            const newConns = [...connections];
            let added = false;
            for (let i = 0; i < selectedIds.length - 1; i++) {
                const from = selectedIds[i];
                const to = selectedIds[i + 1];
                if (!newConns.some(c => (c.from === from && c.to === to) || (c.from === to && c.to === from))) {
                    newConns.push({ from, to });
                    added = true;
                }
            }
            if (added) {
                setConnections(newConns, {
                    changeType: 'connection_change'
                });
            }
        } else if (selectedIds.length === 1) {
            handleConnect(selectedIds[0]); // Starts connection mode
        }
    }, []);

    // C -> Disconnect
    useHotkeys('c', (e) => {
        if (e.metaKey || e.ctrlKey) return;
        const { selectedIds, connections, setConnections } = useStore.getState();
        const selectedIdSet = new Set(selectedIds);
        if (selectedIds.length > 1) {
            setConnections(connections.filter(c =>
                !(selectedIdSet.has(c.from) && selectedIdSet.has(c.to))
            ), {
                changeType: 'connection_change'
            });
        } else if (selectedIds.length === 1) {
            setConnections(connections.filter(c => c.from !== selectedIds[0] && c.to !== selectedIds[0]), {
                changeType: 'connection_change'
            });
        }
    }, []);

    // Undo / Redo
    useHotkeys('mod+z', (e) => {
        e.preventDefault();
        undo();
    }, []);

    useHotkeys('mod+shift+z', (e) => {
        e.preventDefault();
        redo();
    }, []);

    // Copy / Paste
    useHotkeys('mod+c', (e) => {
        if (window.getSelection()?.toString()) return;
        e.preventDefault();
        void handleCopy();
    }, [handleCopy]);

    useHotkeys('mod+v', (e) => {
        e.preventDefault();
        void handlePaste();
    }, [handlePaste]);

    return { handleCopy, handlePaste };
}
