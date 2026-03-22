import { uuid } from '../../utils/uuid';
import { buildGroupData } from '../../utils/groupGeometry';
import { bumpBoardChangeState } from './utils/boardChangeState';

export const createGroupSlice = (set, get) => ({
    groups: [],

    setGroups: (valOrUpdater, options = {}) => set((state) => ({
        groups: typeof valOrUpdater === 'function' ? valOrUpdater(state.groups) : valOrUpdater,
        boardChangeState: options.changeType
            ? bumpBoardChangeState(state.boardChangeState, options.changeType)
            : state.boardChangeState
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
            boardChangeState: bumpBoardChangeState(state.boardChangeState, 'group_change'),
            selectedIds: [] // Deselect cards after grouping
        };
    }),

    updateGroup: (id, updater) => set(state => ({
        groups: state.groups.map(g => g.id === id ? { ...g, ...updater } : g),
        boardChangeState: bumpBoardChangeState(state.boardChangeState, 'group_change')
    })),

    deleteGroup: (id) => set(state => ({
        groups: state.groups.filter(g => g.id !== id),
        boardChangeState: bumpBoardChangeState(state.boardChangeState, 'group_change')
    })),

    // NEW: Move all cards in a group by delta (for drag-to-move entire zone)
    moveGroupCards: (groupId, deltaX, deltaY) => {
        const { groups, moveCardsByIds } = get();
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        moveCardsByIds(group.cardIds, deltaX, deltaY);
    },

    // NEW: Find zone near a card position (for magnetic snap)
    findZoneNearCard: (cardId, threshold = 80) => {
        const { groups, getCardById, getCardMap } = get();
        const card = getCardById(cardId);
        if (!card) return null;
        const cardMap = getCardMap();

        const cardX = card.x || 0;
        const cardY = card.y || 0;
        const cardWidth = card.width || (card.type === 'note' ? 280 : 400);
        const cardHeight = card.height || 200;

        for (const group of groups) {
            // Skip if card is already in this zone
            if (group.cardIds.includes(cardId)) continue;

            const groupData = buildGroupData(group, cardMap);
            if (!groupData) continue;
            const zoneRect = groupData.rect;

            // Expand zone bounds by threshold for detection
            const expandedMinX = zoneRect.x - threshold;
            const expandedMinY = zoneRect.y - threshold;
            const expandedMaxX = zoneRect.x + zoneRect.width + threshold;
            const expandedMaxY = zoneRect.y + zoneRect.height + threshold;

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
