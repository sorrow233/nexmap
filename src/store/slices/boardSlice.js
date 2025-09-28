import { uuid } from '../../utils/uuid';

export const createBoardSlice = (set) => ({
    boardPrompts: [],

    addBoardPrompt: (promptOrText) => set((state) => {
        const newPrompt = typeof promptOrText === 'object'
            ? { id: uuid(), createdAt: Date.now(), ...promptOrText }
            : { id: uuid(), text: promptOrText, createdAt: Date.now() };
        return {
            boardPrompts: [...(state.boardPrompts || []), newPrompt]
        };
    }),

    removeBoardPrompt: (id) => set((state) => ({
        boardPrompts: (state.boardPrompts || []).filter((p) => p.id !== id)
    })),

    updateBoardPrompt: (id, updates) => set((state) => ({
        boardPrompts: (state.boardPrompts || []).map(p =>
            p.id === id
                ? (typeof updates === 'string' ? { ...p, text: updates } : { ...p, ...updates })
                : p
        )
    })),

    // Set all board prompts (e.g. when loading board data)
    setBoardPrompts: (prompts) => set({ boardPrompts: prompts || [] }),
});
