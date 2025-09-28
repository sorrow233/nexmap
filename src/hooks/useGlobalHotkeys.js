import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useStore, undo, redo } from '../store/useStore';

export function useGlobalHotkeys(clipboard, setClipboard) {
    const {
        selectedIds,
        cards,
        setCards,
        handleBatchDelete,
        handleRegenerate,
        handleConnect,
        setConnections,
        connections,
        setSelectedIds,
        offset,
        scale
    } = useStore(state => ({
        selectedIds: state.selectedIds,
        cards: state.cards,
        setCards: state.setCards,
        handleBatchDelete: state.handleBatchDelete,
        handleRegenerate: state.handleRegenerate,
        handleConnect: state.handleConnect,
        setConnections: state.setConnections,
        connections: state.connections,
        setSelectedIds: state.setSelectedIds,
        offset: state.offset,
        scale: state.scale
    }));

    // Helper for Copy
    const handleCopy = async () => {
        if (selectedIds.length === 0) return;
        const selectedCards = cards.filter(c => selectedIds.indexOf(c.id) !== -1);
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
        const newCards = clipboard.map((card, index) => {
            const newId = (Date.now() + Math.random()).toString();
            return {
                ...card, id: newId,
                x: (window.innerWidth / 2 - offset.x) / scale + (index * 20),
                y: (window.innerHeight / 2 - offset.y) / scale + (index * 20),
                data: { ...card.data }
            };
        });
        setCards([...cards, ...newCards]);
        setSelectedIds(newCards.map(c => c.id));
    };

    // Delete / Backspace
    useHotkeys('delete, backspace', () => {
        if (selectedIds.length > 0) handleBatchDelete();
    }, [selectedIds]);

    // R -> Regenerate
    useHotkeys('r', () => {
        if (selectedIds.length > 0) handleRegenerate();
    }, [selectedIds]);

    // L -> Link
    useHotkeys('l', () => {
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
            if (added) setConnections(newConns);
        } else if (selectedIds.length === 1) {
            handleConnect(selectedIds[0]); // Starts connection mode
        }
    }, [selectedIds, connections]);

    // C -> Disconnect
    useHotkeys('c', (e) => {
        if (e.metaKey || e.ctrlKey) return;
        if (selectedIds.length > 1) {
            setConnections(connections.filter(c =>
                !(selectedIds.indexOf(c.from) !== -1 && selectedIds.indexOf(c.to) !== -1)
            ));
        } else if (selectedIds.length === 1) {
            setConnections(connections.filter(c => c.from !== selectedIds[0] && c.to !== selectedIds[0]));
        }
    }, [selectedIds, connections]);

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
    }, [clipboard, selectedIds, cards]);

    useHotkeys('mod+v', (e) => {
        e.preventDefault();
        handlePaste();
    }, [clipboard]);

    return { handleCopy, handlePaste };
}
