import { uuid } from '../../utils/uuid';

export const createGroupSlice = (set, get) => ({
    groups: [],

    setGroups: (valOrUpdater) => set((state) => ({
        groups: typeof valOrUpdater === 'function' ? valOrUpdater(state.groups) : valOrUpdater
    })),

    // --- Group Actions ---
    createGroup: (cardIds, title = 'New Zone') => set(state => {
        const newGroup = {
            id: uuid(),
            title,
            cardIds,
            color: 'blue', // Default color
            description: '', // NEW: Zone description/notes
            icon: '', // NEW: Emoji icon
            customColor: '' // NEW: Custom hex color (overrides color if set)
        };
        return {
            groups: [...state.groups, newGroup],
            selectedIds: [] // Deselect cards after grouping
        };
    }),

    updateGroup: (id, updater) => set(state => ({
        groups: state.groups.map(g => g.id === id ? { ...g, ...updater } : g)
    })),

    deleteGroup: (id) => set(state => ({
        groups: state.groups.filter(g => g.id !== id)
    })),

    // NEW: Move all cards in a group by delta (for drag-to-move entire zone)
    moveGroupCards: (groupId, deltaX, deltaY) => {
        const { groups, cards, setCards } = get();
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        const updatedCards = cards.map(card => {
            if (group.cardIds.includes(card.id)) {
                return {
                    ...card,
                    x: (card.x || 0) + deltaX,
                    y: (card.y || 0) + deltaY
                };
            }
            return card;
        });
        setCards(updatedCards);
    },

    // NEW: Find zone near a card position (for magnetic snap)
    findZoneNearCard: (cardId, threshold = 80) => {
        const { groups, cards } = get();
        const card = cards.find(c => c.id === cardId);
        if (!card) return null;

        const cardX = card.x || 0;
        const cardY = card.y || 0;
        const cardWidth = card.width || (card.type === 'note' ? 280 : 400);
        const cardHeight = card.height || 200;

        for (const group of groups) {
            // Skip if card is already in this zone
            if (group.cardIds.includes(cardId)) continue;

            // Calculate zone bounding box
            const zoneCards = cards.filter(c => group.cardIds.includes(c.id));
            if (zoneCards.length === 0) continue;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            zoneCards.forEach(c => {
                const x = c.x || 0;
                const y = c.y || 0;
                const w = c.width || (c.type === 'note' ? 280 : 400);
                const h = c.height || 200;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + w);
                maxY = Math.max(maxY, y + h);
            });

            // Expand zone bounds by threshold for detection
            const expandedMinX = minX - threshold;
            const expandedMinY = minY - threshold;
            const expandedMaxX = maxX + threshold;
            const expandedMaxY = maxY + threshold;

            // Check if card overlaps with expanded zone
            const cardRight = cardX + cardWidth;
            const cardBottom = cardY + cardHeight;

            if (cardX < expandedMaxX && cardRight > expandedMinX &&
                cardY < expandedMaxY && cardBottom > expandedMinY) {
                return group;
            }
        }
        return null;
    },

    // Add connected cards to zones based on connection relationships
    // When a connection is made, if one card is in a zone, add the other
    addConnectedCardsToZone: (cardId1, cardId2) => {
        const { groups, updateGroup } = get();

        // Find which zones contain each card
        const zone1 = groups.find(g => g.cardIds.includes(cardId1));
        const zone2 = groups.find(g => g.cardIds.includes(cardId2));

        // Case 1: One card in zone, other not - add the other to the zone
        if (zone1 && !zone2) {
            if (!zone1.cardIds.includes(cardId2)) {
                updateGroup(zone1.id, {
                    cardIds: [...zone1.cardIds, cardId2]
                });
            }
        } else if (zone2 && !zone1) {
            if (!zone2.cardIds.includes(cardId1)) {
                updateGroup(zone2.id, {
                    cardIds: [...zone2.cardIds, cardId1]
                });
            }
        }
        // Case 2: Both in different zones - add card2 to zone1 (prioritize first zone)
        else if (zone1 && zone2 && zone1.id !== zone2.id) {
            if (!zone1.cardIds.includes(cardId2)) {
                updateGroup(zone1.id, {
                    cardIds: [...zone1.cardIds, cardId2]
                });
            }
            // Remove from zone2
            updateGroup(zone2.id, {
                cardIds: zone2.cardIds.filter(id => id !== cardId2)
            });
        }
        // Case 3: Both in same zone or both not in zones - no action needed
    },

    // Reset group state on logout
    resetGroupState: () => set({
        groups: []
    })
});
