import { calculateGridLayout } from '../../utils/autoLayout';

export const createSelectionSlice = (set, get) => ({
    // selectedIds is typically managed in canvasSlice or similar, but used here.
    // If it's not defined elsewhere, we should initialize it if we want to be safe, 
    // but usually it's in the store. 
    // Checking contentSlice, it referenced selectedIds but didn't initialize it in its initial state return (it was likely in canvasSlice).
    // However, if we want to move handleBatchDelete here, we can.

    arrangeSelectionGrid: () => {
        const { cards, selectedIds, connections } = get();
        if (!selectedIds || selectedIds.length === 0) return;

        // 1. Identify all card IDs that are part of any connection
        const connectedCardIds = new Set();
        if (connections) {
            connections.forEach(conn => {
                connectedCardIds.add(conn.from);
                connectedCardIds.add(conn.to);
            });
        }

        // 2. Filter selected cards to exclude those with connections
        const selectedCards = cards.filter(c =>
            selectedIds.includes(c.id) && !connectedCardIds.has(c.id)
        );

        if (selectedCards.length === 0) return;

        // Calculate bounding box start (top-left) to anchor the grid
        let minX = Infinity;
        let minY = Infinity;

        selectedCards.forEach(c => {
            if (c.x < minX) minX = c.x;
            if (c.y < minY) minY = c.y;
        });

        // const { calculateGridLayout } = require('../../utils/autoLayout'); // Already imported
        const newPositions = calculateGridLayout(selectedCards, minX, minY);

        if (newPositions.size === 0) return;

        set(state => ({
            cards: state.cards.map(card => {
                const newPos = newPositions.get(card.id);
                if (newPos) {
                    return { ...card, x: newPos.x, y: newPos.y };
                }
                return card;
            })
        }));
    },

    handleBatchDelete: () => {
        const { selectedIds } = get();
        if (!selectedIds || selectedIds.length === 0) return;

        set(state => ({
            cards: state.cards.filter(c => selectedIds.indexOf(c.id) === -1),
            connections: state.connections.filter(conn =>
                selectedIds.indexOf(conn.from) === -1 && selectedIds.indexOf(conn.to) === -1
            ),
            // Clean up groups that might lose all their cards? 
            // Currently we keep empty groups or groups with missing cards, 
            // but let's filter cardIds inside groups to keep it clean.
            groups: state.groups.map(g => ({
                ...g,
                cardIds: g.cardIds.filter(id => selectedIds.indexOf(id) === -1)
            })).filter(g => g.cardIds.length > 0), // Remove empty groups
            selectedIds: [],
            expandedCardId: selectedIds.indexOf(state.expandedCardId) !== -1 ? null : state.expandedCardId
        }));
    },
});
