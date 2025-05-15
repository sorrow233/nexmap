export const createCanvasSlice = (set, get) => ({
    offset: { x: 0, y: 0 },
    scale: 1,
    selectedIds: [],
    interactionMode: 'none',
    selectionRect: null,
    isConnecting: false,
    connectionStartId: null,
    backgroundImage: null, // New field for board-specific background

    setOffset: (valOrUpdater) => set((state) => ({
        offset: typeof valOrUpdater === 'function' ? valOrUpdater(state.offset) : valOrUpdater
    })),
    setScale: (valOrUpdater) => set((state) => ({
        scale: typeof valOrUpdater === 'function' ? valOrUpdater(state.scale) : valOrUpdater
    })),
    setSelectedIds: (valOrUpdater) => set((state) => ({
        selectedIds: typeof valOrUpdater === 'function' ? valOrUpdater(state.selectedIds) : valOrUpdater
    })),
    setInteractionMode: (valOrUpdater) => set((state) => ({
        interactionMode: typeof valOrUpdater === 'function' ? valOrUpdater(state.interactionMode) : valOrUpdater
    })),
    setSelectionRect: (valOrUpdater) => set((state) => ({
        selectionRect: typeof valOrUpdater === 'function' ? valOrUpdater(state.selectionRect) : valOrUpdater
    })),
    setIsConnecting: (val) => set({ isConnecting: val }),
    setConnectionStartId: (val) => set({ connectionStartId: val }),

    moveOffset: (dx, dy) => set((state) => ({
        offset: { x: state.offset.x + dx, y: state.offset.y + dy }
    })),

    restoreViewport: (viewport) => set({
        offset: viewport.offset || { x: 0, y: 0 },
        scale: viewport.scale || 1
    }),

    isBoardLoading: false, // New field to track board loading state
    setIsBoardLoading: (val) => set({ isBoardLoading: val }),

    toCanvasCoords: (viewX, viewY) => {
        const { offset, scale } = get();
        return {
            x: (viewX - offset.x) / scale,
            y: (viewY - offset.y) / scale
        };
    }
});
