import { useStore } from '../store/useStore';
import { uuid } from '../utils/uuid';
import { saveBoard } from '../services/storage';
import { debugLog } from '../utils/debugLogger';

export function useNeuralNotepad() {
    const {
        cards,
        updateCard,
        addCard,
        offset,
        scale
    } = useStore();

    /**
     * Neural Notepad (Sticky Note) handling
     */
    const handleCreateNote = (text = '', isMaster = false, currentBoardId = null) => {
        const safeText = (typeof text === 'string' ? text : '').trim();
        if (!safeText && isMaster) return;

        debugLog.ui('Note creation triggered', { text: safeText, isMaster });

        const existingNote = cards.find(c => c.type === 'note');

        if (existingNote) {
            const currentContent = existingNote.data.content || '';
            const lines = currentContent.split('\n').filter(l => l.trim());
            let nextNum = 1;

            if (lines.length > 0) {
                const numbers = lines
                    .map(line => {
                        const match = line.match(/^(\d+)\./);
                        return match ? parseInt(match[1], 10) : null;
                    })
                    .filter(n => n !== null);
                if (numbers.length > 0) nextNum = Math.max(...numbers) + 1;
            }

            const nextNumberStr = String(nextNum).padStart(2, '0');
            const newEntry = `${nextNumberStr}. ${safeText}`;
            const separator = currentContent.trim() ? '\n\n' : '';
            const updatedContent = currentContent + separator + newEntry;

            updateCard(existingNote.id, {
                ...existingNote.data,
                content: updatedContent,
                isNotepad: true
            });
            debugLog.ui(`Appended to existing note: ${existingNote.id}`);
        } else {
            const newId = uuid();
            addCard({
                id: newId,
                type: 'note',
                x: Math.max(0, (window.innerWidth / 2 - offset.x) / scale - 160),
                y: Math.max(0, (window.innerHeight / 2 - offset.y) / scale - 250),
                createdAt: Date.now(),
                data: {
                    content: `01. ${safeText}`,
                    color: 'yellow',
                    isNotepad: true,
                    title: 'Neural Notepad'
                }
            });
            debugLog.ui(`Created new master note: ${newId}`);
        }

        // Trigger persistence
        if (currentBoardId) {
            setTimeout(() => {
                const latestState = useStore.getState();
                saveBoard(currentBoardId, {
                    cards: latestState.cards,
                    connections: latestState.connections
                });
            }, 50);
        }
    };

    const createStandaloneNote = (text = '', position = null, currentBoardId = null) => {
        const safeText = (typeof text === 'string' ? text : '').trim();
        const newId = uuid();

        // Calculate position (default center or specific)
        let noteX, noteY;
        if (position) {
            noteX = position.x;
            noteY = position.y;
        } else {
            noteX = Math.max(0, (window.innerWidth / 2 - offset.x) / scale - 160);
            noteY = Math.max(0, (window.innerHeight / 2 - offset.y) / scale - 250);
        }

        addCard({
            id: newId,
            type: 'note',
            x: noteX,
            y: noteY,
            createdAt: Date.now(),
            data: {
                content: safeText, // Standalone note usually starts empty or with specific text, no numbering enforced
                color: 'yellow',
                isNotepad: false, // Explicitly NOT the master notepad
                title: 'Note'
            }
        });
        debugLog.ui(`Created standalone note: ${newId}`);

        // Trigger persistence
        if (currentBoardId) {
            setTimeout(() => {
                const latestState = useStore.getState();
                saveBoard(currentBoardId, {
                    cards: latestState.cards,
                    connections: latestState.connections
                });
            }, 50);
        }
    };

    return {
        handleCreateNote,
        createStandaloneNote
    };
}
