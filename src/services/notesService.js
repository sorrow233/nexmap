import { loadBoardDataForSearch, saveBoard, saveBoardToCloud } from './storage';

const FALLBACK_TITLE = 'Untitled Note';
const NOTE_UPDATES_EVENT = 'notes-updated';

const normalizeText = (value) => (typeof value === 'string' ? value.replace(/\r\n/g, '\n') : '');

const getNoteContent = (card) => normalizeText(card?.data?.content || '');

const getNoteTitle = (card, content) => {
    const customTitle = normalizeText(card?.data?.title || '').trim();
    if (customTitle && !['note', 'neural notepad'].includes(customTitle.toLowerCase())) {
        return customTitle;
    }

    const firstLine = content.split('\n').map(line => line.trim()).find(Boolean);
    if (!firstLine) return FALLBACK_TITLE;
    return firstLine.length > 60 ? `${firstLine.slice(0, 60)}...` : firstLine;
};

const getNotePreview = (content) => {
    const flattened = content.replace(/\s+/g, ' ').trim();
    if (!flattened) return '';
    return flattened.length > 180 ? `${flattened.slice(0, 180)}...` : flattened;
};

const toTimestamp = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    return 0;
};

const emitNotesUpdated = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(NOTE_UPDATES_EVENT));
    }
};

const getActiveBoards = (boardsList = []) => {
    if (!Array.isArray(boardsList)) return [];
    return boardsList.filter(board => board && !board.deletedAt);
};

const isNoteCard = (card) => card?.type === 'note' && !card?.deletedAt;

const normalizeNote = (card, board) => {
    const content = getNoteContent(card);
    const title = getNoteTitle(card, content);
    const updatedAt = toTimestamp(card?.updatedAt) || toTimestamp(board?.updatedAt) || toTimestamp(card?.createdAt) || toTimestamp(board?.createdAt);
    const createdAt = toTimestamp(card?.createdAt) || toTimestamp(board?.createdAt) || updatedAt || Date.now();

    return {
        id: card.id,
        boardId: board.id,
        boardName: board.name || 'Untitled Board',
        title,
        preview: getNotePreview(content),
        content,
        isMaster: Boolean(card?.data?.isNotepad),
        createdAt,
        updatedAt,
        charCount: content.length
    };
};

const sortNotes = (notes = []) => {
    return [...notes].sort((a, b) => {
        const timeDelta = (b.updatedAt || 0) - (a.updatedAt || 0);
        if (timeDelta !== 0) return timeDelta;
        return (b.createdAt || 0) - (a.createdAt || 0);
    });
};

const loadBoardSafe = async (boardId) => {
    const data = await loadBoardDataForSearch(boardId);
    if (!data || typeof data !== 'object') {
        return { cards: [], connections: [], groups: [], boardPrompts: [] };
    }
    return {
        cards: Array.isArray(data.cards) ? data.cards : [],
        connections: Array.isArray(data.connections) ? data.connections : [],
        groups: Array.isArray(data.groups) ? data.groups : [],
        boardPrompts: Array.isArray(data.boardPrompts) ? data.boardPrompts : [],
        ...data
    };
};

const persistBoard = async (boardId, boardData, userId = null) => {
    await saveBoard(boardId, boardData);
    if (userId) {
        await saveBoardToCloud(userId, boardId, boardData);
    }
    emitNotesUpdated();
};

const notesService = {
    NOTE_UPDATES_EVENT,

    async getNotesIndex(boardsList = []) {
        const boards = getActiveBoards(boardsList);
        const notesByBoard = await Promise.all(boards.map(async (board) => {
            const boardData = await loadBoardSafe(board.id);
            const notes = boardData.cards.filter(isNoteCard).map(card => normalizeNote(card, board));
            return notes;
        }));

        return sortNotes(notesByBoard.flat());
    },

    async updateNoteContent({ boardId, noteId, content, userId = null }) {
        const safeContent = normalizeText(content);
        const boardData = await loadBoardSafe(boardId);
        const now = Date.now();

        const nextCards = boardData.cards.map(card => {
            if (card.id !== noteId) return card;
            return {
                ...card,
                updatedAt: now,
                data: {
                    ...(card.data || {}),
                    content: safeContent
                }
            };
        });

        await persistBoard(boardId, {
            ...boardData,
            cards: nextCards,
            updatedAt: now
        }, userId);

        return now;
    },

    async softDeleteNote({ boardId, noteId, userId = null }) {
        const boardData = await loadBoardSafe(boardId);
        const now = Date.now();

        const nextCards = boardData.cards.map(card => {
            if (card.id !== noteId) return card;
            return {
                ...card,
                deletedAt: now,
                updatedAt: now
            };
        });

        await persistBoard(boardId, {
            ...boardData,
            cards: nextCards,
            updatedAt: now
        }, userId);

        return now;
    }
};

export default notesService;
