import { debugLog } from '../../utils/debugLogger';

export const createCanvasSlice = (set, get) => ({
    offset: { x: 0, y: 0 },
    scale: 1,
    selectedIds: [],
    interactionMode: 'none',
    canvasMode: 'select', // 'select' or 'pan' - Modern canvas tool mode
    selectionRect: null,
    isConnecting: false,
    connectionStartId: null,
    backgroundImage: null, // New field for board-specific background

    setOffset: (valOrUpdater) => {
        const nextOffset = typeof valOrUpdater === 'function' ? valOrUpdater(get().offset) : valOrUpdater;
        // debugLog.ui('Canvas offset change', nextOffset); // Too frequent during pan
        set({ offset: nextOffset });
    },
    setScale: (valOrUpdater) => {
        const nextScale = typeof valOrUpdater === 'function' ? valOrUpdater(get().scale) : valOrUpdater;
        debugLog.ui('Canvas zoom change', { scale: nextScale });
        set({ scale: nextScale });
    },
    setSelectedIds: (valOrUpdater) => {
        const nextIds = typeof valOrUpdater === 'function' ? valOrUpdater(get().selectedIds) : valOrUpdater;
        debugLog.ui('Selection change', { count: nextIds.length, ids: nextIds });
        set({ selectedIds: nextIds });
    },
    setInteractionMode: (valOrUpdater) => {
        const nextMode = typeof valOrUpdater === 'function' ? valOrUpdater(get().interactionMode) : valOrUpdater;
        debugLog.ui('Interaction mode change', { mode: nextMode });
        set({ interactionMode: nextMode });
    },
    setSelectionRect: (valOrUpdater) => set((state) => ({
        selectionRect: typeof valOrUpdater === 'function' ? valOrUpdater(state.selectionRect) : valOrUpdater
    })),
    setIsConnecting: (val) => {
        debugLog.ui(`Connection state: ${val}`);
        set({ isConnecting: val });
    },
    setConnectionStartId: (val) => set({ connectionStartId: val }),

    setCanvasMode: (mode) => {
        debugLog.ui('Canvas mode change', { mode });
        set({ canvasMode: mode });
    },
    toggleCanvasMode: () => {
        const currentMode = get().canvasMode;
        const nextMode = currentMode === 'select' ? 'pan' : 'select';
        debugLog.ui('Canvas mode toggled', { from: currentMode, to: nextMode });
        set({ canvasMode: nextMode });
    },

    moveOffset: (dx, dy) => set((state) => ({
        offset: { x: state.offset.x + dx, y: state.offset.y + dy }
    })),

    restoreViewport: (viewport) => {
        debugLog.storage('Restoring viewport from saved state', viewport);
        set({
            offset: viewport.offset || { x: 0, y: 0 },
            scale: viewport.scale || 1
        });
    },

    isBoardLoading: false, // New field to track board loading state
    setIsBoardLoading: (val) => {
        debugLog.ui(`Board loading state: ${val}`);
        set({ isBoardLoading: val });
    },

    // Smoothly focus/zoom on a specific card
    focusOnCard: (cardId) => {
        debugLog.ui(`focusOnCard animate start for ID: ${cardId}`);
        const { cards, offset, scale, setOffset, setScale } = get();
        const card = cards.find(c => c.id === cardId);
        if (!card) {
            debugLog.error(`focusOnCard: Card NOT found in state! ID: ${cardId}`);
            return;
        }

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
            } else {
                debugLog.ui('focusOnCard animation complete');
            }
        }

        requestAnimationFrame(animate);
    },

    // Find and focus on the nearest card to the current viewport center
    focusOnNearestCard: () => {
        const { cards, offset, scale, focusOnCard } = get();

        if (!cards || cards.length === 0) {
            debugLog.ui('focusOnNearestCard: No cards available');
            return;
        }

        // Calculate current viewport center in canvas coordinates
        const viewportCenterX = (window.innerWidth / 2 - offset.x) / scale;
        const viewportCenterY = (window.innerHeight / 2 - offset.y) / scale;

        debugLog.ui('focusOnNearestCard: viewport center', { viewportCenterX, viewportCenterY });

        // Find the card closest to viewport center
        let nearestCard = null;
        let minDistance = Infinity;

        const CARD_WIDTH = 320;
        const CARD_HEIGHT = 300;

        for (const card of cards) {
            // Calculate card center
            const cardCenterX = card.x + CARD_WIDTH / 2;
            const cardCenterY = card.y + CARD_HEIGHT / 2;

            // Calculate distance from viewport center to card center
            const distance = Math.sqrt(
                Math.pow(cardCenterX - viewportCenterX, 2) +
                Math.pow(cardCenterY - viewportCenterY, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestCard = card;
            }
        }

        if (nearestCard) {
            debugLog.ui('focusOnNearestCard: Navigating to card', { id: nearestCard.id, distance: minDistance });
            focusOnCard(nearestCard.id);
        }
    },

    toCanvasCoords: (viewX, viewY) => {
        const { offset, scale } = get();
        return {
            x: (viewX - offset.x) / scale,
            y: (viewY - offset.y) / scale
        };
    }
});
