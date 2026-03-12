import { calculateLayout, calculateGridLayout } from '../../utils/autoLayout';
import { getConnectedGraph } from '../../utils/graphUtils';
import { debugLog } from '../../utils/debugLogger';

const findCardIndexById = (cards, id) => cards.findIndex((card) => card.id === id);

export const createCardSlice = (set, get) => ({
    cards: [],
    expandedCardId: null,
    lastSavedAt: 0,

    // Flag to prevent cloud sync loops
    // When true, BoardPage should skip saveBoardToCloud
    isHydratingFromCloud: false,
    setIsHydratingFromCloud: (val) => set({ isHydratingFromCloud: val }),

    setLastSavedAt: (val) => set({ lastSavedAt: val }),

    setCards: (cardsOrUpdater) => {
        const nextCards = typeof cardsOrUpdater === 'function' ? cardsOrUpdater(get().cards) : cardsOrUpdater;
        debugLog.store('Bulk setting cards', { count: nextCards.length });
        set({ cards: nextCards });
    },

    // Special setter that marks data as coming from cloud sync
    // This prevents the save loop: cloud -> setCards -> autosave -> cloud
    setCardsFromCloud: (cards) => {
        debugLog.store('Setting cards from cloud sync (hydrating)', { count: cards?.length || 0 });
        set({ cards: cards || [], isHydratingFromCloud: true });
        // Clear flag after a short delay to allow BoardPage effect to skip
        setTimeout(() => set({ isHydratingFromCloud: false }), 500);
    },

    setExpandedCardId: (id) => {
        debugLog.ui(`Focusing/Expanding card: ${id}`);
        set({ expandedCardId: id });
    },

    addCard: (card) => {
        const newCard = {
            ...card,
            createdAt: card.createdAt || Date.now()
        };
        debugLog.store(`Adding new card: ${newCard.id}`, newCard);
        set((state) => ({
            cards: [...state.cards, newCard]
        }));
        // Removed: position-based auto-add to zone
        // Cards now only join zones via connections
    },

    updateCard: (id, updater) => {
        debugLog.store(`Updating card data: ${id}`, updater);
        set((state) => {
            const index = findCardIndexById(state.cards, id);
            if (index === -1) return state;

            const nextCards = state.cards.slice();
            const currentCard = nextCards[index];
            const updatedData = typeof updater === 'function'
                ? updater(currentCard.data)
                : updater;

            nextCards[index] = {
                ...currentCard,
                data: { ...currentCard.data, ...updatedData }
            };

            return { cards: nextCards };
        });
    },

    // Special handler for the component refactor
    updateCardFull: (id, updater) => {
        debugLog.store(`Full update for card: ${id}`, updater);
        set((state) => {
            const index = findCardIndexById(state.cards, id);
            if (index === -1) return state;

            const nextCards = state.cards.slice();
            const currentCard = nextCards[index];
            const updatedData = typeof updater === 'function'
                ? updater(currentCard.data)
                : updater;

            nextCards[index] = {
                ...currentCard,
                data: {
                    ...(currentCard.data || {}),
                    ...updatedData
                }
            };

            return { cards: nextCards };
        });
    },

    // Soft delete: mark card as deleted instead of removing
    deleteCard: (id) => {
        debugLog.store(`Soft deleting card: ${id}`);
        set((state) => {
            const nextGenerating = new Set(state.generatingCardIds);
            nextGenerating.delete(id);
            const nextSelected = state.selectedIds ? state.selectedIds.filter(sid => sid !== id) : [];
            const index = findCardIndexById(state.cards, id);
            if (index === -1) return state;

            const nextCards = state.cards.slice();
            nextCards[index] = { ...nextCards[index], deletedAt: Date.now() };

            return {
                cards: nextCards,
                // Still remove connections for soft-deleted cards (they'll be restored if card is restored)
                connections: state.connections ? state.connections.filter(conn => conn.from !== id && conn.to !== id) : [],
                generatingCardIds: nextGenerating,
                selectedIds: nextSelected,
                expandedCardId: state.expandedCardId === id ? null : state.expandedCardId
            };
        });
    },

    // Restore a soft-deleted card
    restoreCard: (id) => {
        debugLog.store(`Restoring card: ${id}`);
        set((state) => {
            const index = findCardIndexById(state.cards, id);
            if (index === -1) return state;

            const nextCards = state.cards.slice();
            nextCards[index] = { ...nextCards[index], deletedAt: undefined };

            return { cards: nextCards };
        });
    },

    // Permanently delete a card (used for cleanup after retention period)
    permanentlyDeleteCard: (id) => {
        debugLog.store(`Permanently deleting card: ${id}`);
        set((state) => ({
            cards: state.cards.filter(c => c.id !== id)
        }));
    },

    arrangeCards: () => {
        const { cards: allCards, connections, groups } = get();
        // Filter out soft-deleted cards for layout calculations
        const cards = allCards.filter(c => !c.deletedAt);
        debugLog.ui('Arranging cards layout...', { hasGroups: groups?.length > 0, hasConnections: connections?.length > 0 });

        // 1. If Groups Exist: Respect them, Grid the rest
        if (groups && groups.length > 0) {
            // Identify gathered cards
            const groupedCardIds = new Set();
            groups.forEach(g => {
                if (g.cardIds) g.cardIds.forEach(id => groupedCardIds.add(id));
            });

            const looseCards = cards.filter(c => !groupedCardIds.has(c.id));
            if (looseCards.length === 0) return;

            // Find safe bounds (to the right of everything)
            let maxX = -Infinity;
            let minY = Infinity;

            cards.forEach(c => {
                if (c.x > maxX) maxX = c.x;
                // track min Y to align broadly with top
                if (c.y < minY) minY = c.y;
            });

            if (!Number.isFinite(maxX)) maxX = 0;
            if (!Number.isFinite(minY)) minY = 0;

            const safeX = maxX + 400; // Gap
            const safeY = minY;

            const newPositions = calculateGridLayout(looseCards, safeX, safeY);

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
            return;
        }

        // 2. No Groups: Smart Choice
        if (connections && connections.length > 0) {
            // Existing Mind Map Logic
            const newPositions = calculateLayout(cards, connections);
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
        } else {
            // Grid Layout (Start at top-left of current view? Or average position?)
            // Filter out cards that are already connected (part of a mind map)
            const connectedCardIds = new Set();
            if (connections) {
                connections.forEach(conn => {
                    connectedCardIds.add(conn.from);
                    connectedCardIds.add(conn.to);
                });
            }

            const looseCards = cards.filter(c => !connectedCardIds.has(c.id));
            if (looseCards.length === 0) return;

            // Let's find top-left of loose cards to anchor
            let minX = Infinity;
            let minY = Infinity;
            looseCards.forEach(c => {
                if (c.x < minX) minX = c.x;
                if (c.y < minY) minY = c.y;
            });

            if (!Number.isFinite(minX)) { minX = 0; minY = 0; }

            const newPositions = calculateGridLayout(looseCards, minX, minY);
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
        }
    },

    handleCardMove: (id, newX, newY, moveWithConnections = false) => {
        const { cards, connections, selectedIds } = get();
        const sourceCard = cards.find(c => c.id === id);
        if (!sourceCard) return;

        const dx = newX - sourceCard.x;
        const dy = newY - sourceCard.y;
        if (dx === 0 && dy === 0) return;
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
            debugLog.error("Invalid move delta detected", { dx, dy });
            return;
        }

        // Determine which cards to move based on mode
        const isSelected = selectedIds ? selectedIds.indexOf(id) !== -1 : false;
        let moveIds;

        if (moveWithConnections) {
            // Cmd pressed: Move entire connected graph
            const sourceIds = isSelected ? selectedIds : [id];
            moveIds = new Set();
            sourceIds.forEach(sourceId => {
                const connectedParams = getConnectedGraph(sourceId, connections || []);
                connectedParams.forEach(cid => moveIds.add(cid));
            });
        } else {
            // Default: Move only the selected card(s) independently
            moveIds = new Set(isSelected ? selectedIds : [id]);
        }

        set((state) => {
            const nextCards = state.cards.slice();
            const movedCardIndexes = new Map();

            state.cards.forEach((card, index) => {
                if (moveIds.has(card.id)) {
                    movedCardIndexes.set(card.id, index);
                }
            });

            movedCardIndexes.forEach((index, movedId) => {
                const card = nextCards[index];
                if (!card || card.id !== movedId) return;
                nextCards[index] = { ...card, x: card.x + dx, y: card.y + dy };
            });

            return { cards: nextCards };
        });
    },

    // Alias for explicit drag end handling + Magnetic snap to zones
    handleCardMoveEnd: (id, newX, newY, moveWithConnections = false) => {
        debugLog.ui(`Card move end: ${id}`, { newX, newY });
        get().handleCardMove(id, newX, newY, moveWithConnections);

        // Magnetic snap: Check if card is near a zone
        const { findZoneNearCard, updateGroup } = get();
        if (findZoneNearCard) {
            const nearbyZone = findZoneNearCard(id, 80); // 80px threshold
            if (nearbyZone && !nearbyZone.cardIds.includes(id)) {
                // Add card to zone
                updateGroup(nearbyZone.id, {
                    cardIds: [...nearbyZone.cardIds, id]
                });
                debugLog.ui(`Card ${id} snapped to zone: ${nearbyZone.title}`);
            }
        }
    },

    // Reset card state on logout
    resetCardState: () => set({
        cards: [],
        expandedCardId: null,
        lastSavedAt: 0
    })
});
