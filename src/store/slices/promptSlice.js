
import { uuid } from '../../utils/uuid';

export const createPromptSlice = (set, get) => ({
    boardPrompts: [],

    addBoardPrompt: (text) => set((state) => ({
        boardPrompts: [...state.boardPrompts, { id: uuid(), text, createdAt: Date.now() }]
    })),

    removeBoardPrompt: (id) => set((state) => ({
        boardPrompts: state.boardPrompts.filter(p => p.id !== id)
    })),

    updateBoardPrompt: (id, text) => set((state) => ({
        boardPrompts: state.boardPrompts.map(p =>
            p.id === id ? { ...p, text } : p
        )
    })),

    // For loading from storage
    setBoardPrompts: (prompts) => set({ boardPrompts: prompts || [] }),
});
