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

    // Smoothly focus/zoom on a specific card
    focusOnCard: (cardId) => {
        console.log('[DEBUG] focusOnCard called for ID:', cardId);
        const { cards, offset, scale, setOffset, setScale } = get();
        const card = cards.find(c => c.id === cardId);
        if (!card) {
            console.warn('[DEBUG] focusOnCard: Card NOT found in state!', cardId);
            return;
        }

        console.log('[DEBUG] focusOnCard: Target card title:', card.data?.title);
        console.log('[DEBUG] focusOnCard: Current viewport - offset:', offset, 'scale:', scale);
        console.log('[DEBUG] focusOnCard: Card location:', card.x, card.y);

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Target state: center of screen, fixed scale for focus
        const targetScale = 0.85;
        const CARD_WIDTH = 320;
        const CARD_HEIGHT = 400;

        const targetX = viewportWidth / 2 - card.x * targetScale - (CARD_WIDTH * targetScale) / 2;
        const targetY = viewportHeight / 2 - card.y * targetScale - (CARD_HEIGHT * targetScale) / 2;

        const startOffset = { ...offset };
        const startScale = scale;
        const startTime = performance.now();
        const duration = 800; // Silky smooth 800ms

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // easeOutExpo for a premium feel
            const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            setOffset({
                x: startOffset.x + (targetX - startOffset.x) * ease,
                y: startOffset.y + (targetY - startOffset.y) * ease
            });
            setScale(startScale + (targetScale - startScale) * ease);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    },

    toCanvasCoords: (viewX, viewY) => {
        const { offset, scale } = get();
        return {
            x: (viewX - offset.x) / scale,
            y: (viewY - offset.y) / scale
        };
    }
});
