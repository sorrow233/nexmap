export const createBoardSlice = (set) => ({
    boardPrompts: [],
    addBoardPrompt: (prompt) => set((state) => ({
        boardPrompts: [...(state.boardPrompts || []), prompt]
    })),
    removeBoardPrompt: (id) => set((state) => ({
        boardPrompts: (state.boardPrompts || []).filter((p) => p.id !== id)
    })),
    // Optional: Set all board prompts (e.g. when loading board data)
    setBoardPrompts: (prompts) => set({ boardPrompts: prompts }),
});
