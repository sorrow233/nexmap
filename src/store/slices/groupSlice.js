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
});
