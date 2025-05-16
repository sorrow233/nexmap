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
            color: 'blue' // Default color
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

    // Check if a card position is inside a group's bounding box
    isCardInGroup: (cardX, cardY, groupId) => {
        const { cards, groups } = get();
        const group = groups.find(g => g.id === groupId);
        if (!group || !group.cardIds || group.cardIds.length === 0) return false;

        const groupCards = cards.filter(c => group.cardIds.includes(c.id));
        if (groupCards.length === 0) return false;

        // Calculate group bounds (same logic as Zone.jsx)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        groupCards.forEach(c => {
            const width = c.type === 'note' ? 280 : 320;
            const height = c.type === 'note' ? 280 : 400;
            minX = Math.min(minX, c.x);
            minY = Math.min(minY, c.y);
            maxX = Math.max(maxX, c.x + width);
            maxY = Math.max(maxY, c.y + height);
        });

        const PADDING = 80;
        minX -= PADDING;
        minY -= PADDING;
        maxX += PADDING;
        maxY += PADDING;

        // Check if card position is inside bounds
        return cardX >= minX && cardX <= maxX && cardY >= minY && cardY <= maxY;
    },

    // Auto-add card to zone if it's created inside one
    autoAddCardToZone: (cardId, cardX, cardY) => {
        const { groups, updateGroup } = get();

        for (const group of groups) {
            if (get().isCardInGroup(cardX, cardY, group.id)) {
                // Add card to this group's cardIds if not already there
                if (!group.cardIds.includes(cardId)) {
                    updateGroup(group.id, {
                        cardIds: [...group.cardIds, cardId]
                    });
                }
                break; // Only add to first matching group
            }
        }
    },
});
