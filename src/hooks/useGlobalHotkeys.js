import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useStore, undo, redo } from '../store/useStore';

export function useGlobalHotkeys(clipboard, setClipboard) {
    // Helper for Copy
    const handleCopy = async () => {
        const { selectedIds, cards } = useStore.getState();
        if (selectedIds.length === 0) return;
        const selectedIdSet = new Set(selectedIds);
        const selectedCards = cards.filter(c => selectedIdSet.has(c.id));
        setClipboard(selectedCards);
        try {
            const textContent = selectedCards.map(c => {
                const lastMsg = c.data.messages[c.data.messages.length - 1];
                return lastMsg ? lastMsg.content : '';
            }).join('\n\n---\n\n');
            if (textContent) await navigator.clipboard.writeText(textContent);
        } catch (e) { console.error(e); }
    };

    // Helper for Paste
    const handlePaste = () => {
        if (!clipboard || clipboard.length === 0) return;
        const {
            cards,
            offset,
            scale,
            setCards,
            setSelectedIds
        } = useStore.getState();
        const newCards = clipboard.map((card, index) => {
            const newId = (Date.now() + Math.random()).toString();
            return {
                ...card, id: newId,
                x: (window.innerWidth / 2 - offset.x) / scale + (index * 20),
                y: (window.innerHeight / 2 - offset.y) / scale + (index * 20),
                data: { ...card.data }
            };
        });
        setCards([...cards, ...newCards], {
            changeType: 'card_add',
            reason: 'handlePaste'
        });
        setSelectedIds(newCards.map(c => c.id));
    };

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
        handleCopy();
    }, [clipboard, setClipboard]);

    useHotkeys('mod+v', (e) => {
        e.preventDefault();
        handlePaste();
    }, [clipboard]);

    return { handleCopy, handlePaste };
}
