import { calculateLayout, calculateGridLayout } from '../../utils/autoLayout';
import {
    resolveDraggedCardIds
} from '../../utils/cardDrag';
import { debugLog } from '../../utils/debugLogger';
import { normalizeCardTimestamps } from '../../services/cards/cardTimestamps';
import {
    createCardIndexMutation,
    nextCardIndexMutation
} from './utils/cardIndexMutation';

const createCardLookupCache = () => {
    let cachedCardsRef = null;
    let cachedIndexById = new Map();
    let cachedCardMap = new Map();

    const rebuild = (cards = []) => {
        cachedIndexById = new Map();
        cachedCardMap = new Map();
        cards.forEach((card, index) => {
            cachedIndexById.set(card.id, index);
            cachedCardMap.set(card.id, card);
        });
        cachedCardsRef = cards;
        return {
            indexById: cachedIndexById,
            cardMap: cachedCardMap
        };
    };

    return {
        ensure(cards = []) {
            if (cachedCardsRef === cards) {
                return {
                    indexById: cachedIndexById,
                    cardMap: cachedCardMap
                };
            }

            return rebuild(cards);
        },
        rebuild,
        patch(nextCards, updatedCards = []) {
            if (cachedCardsRef === null) {
                rebuild(nextCards);
                return;
            }

            cachedCardsRef = nextCards;
            updatedCards.forEach((card) => {
                if (card) {
                    cachedCardMap.set(card.id, card);
                }
            });
        },
        clear() {
            cachedCardsRef = null;
            cachedIndexById = new Map();
            cachedCardMap = new Map();
        }
    };
};

export const createCardSlice = (set, get) => {
    const cardLookup = createCardLookupCache();
    const buildCardIndexMutation = (state, config = {}) => (
        nextCardIndexMutation(state?.cardIndexMutation, config)
    );
    const normalizePersistenceCursor = (cursor = {}) => {
        const updatedAt = Number(cursor.updatedAt);
        const clientRevision = Number(cursor.clientRevision);

        return {
            updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? updatedAt : 0,
            clientRevision: Number.isFinite(clientRevision) && clientRevision >= 0 ? clientRevision : 0,
            dirty: cursor?.dirty === true
        };
    };

    const normalizeExternalSyncMarker = (marker = {}) => {
        const token = Number(marker.token);
        return {
            token: Number.isFinite(token) && token > 0 ? token : 0,
            boardId: typeof marker.boardId === 'string' ? marker.boardId : '',
            fingerprint: typeof marker.fingerprint === 'string' ? marker.fingerprint : '',
            updatedAt: Number.isFinite(Number(marker.updatedAt)) && Number(marker.updatedAt) >= 0
                ? Number(marker.updatedAt)
                : 0,
            clientRevision: Number.isFinite(Number(marker.clientRevision)) && Number(marker.clientRevision) >= 0
                ? Number(marker.clientRevision)
                : 0
        };
    };

    return {
    cards: [],
    cardIndexMutation: createCardIndexMutation(),
    expandedCardId: null,
    lastSavedAt: 0,
	    activeBoardPersistence: {
	        updatedAt: 0,
	        clientRevision: 0,
	        dirty: false
	    },
        lastExternalSyncMarker: {
            token: 0,
            boardId: '',
            fingerprint: '',
            updatedAt: 0,
            clientRevision: 0
        },

	    setLastSavedAt: (val) => set({ lastSavedAt: val }),
	    setActiveBoardPersistence: (cursor) => set((state) => ({
	        activeBoardPersistence: normalizePersistenceCursor({
	            ...state.activeBoardPersistence,
	            ...cursor
	        })
	    })),
        setExternalSyncMarker: (marker) => set((state) => {
            const normalizedMarker = normalizeExternalSyncMarker(marker);
            const nextToken = state.lastExternalSyncMarker.token + 1;
            return {
                lastExternalSyncMarker: {
                    ...normalizedMarker,
                    token: normalizedMarker.token || nextToken
                }
            };
        }),

	    setCards: (cardsOrUpdater) => {
	        const nextCards = typeof cardsOrUpdater === 'function' ? cardsOrUpdater(get().cards) : cardsOrUpdater;
	        debugLog.store('Bulk setting cards', { count: nextCards.length });
	        cardLookup.rebuild(nextCards);
        set((state) => ({
            cards: nextCards,
            cardIndexMutation: buildCardIndexMutation(state, {
                mode: 'bulk',
                reason: 'setCards'
            })
        }));
    },

    getCardById: (id) => {
        if (!id) return null;
        const { cardMap } = cardLookup.ensure(get().cards);
        return cardMap.get(id) || null;
    },

    getCardsByIds: (ids = []) => {
        const { cardMap, indexById } = cardLookup.ensure(get().cards);
        return Array.from(ids)
            .map((id) => cardMap.get(id))
            .filter(Boolean)
            .sort((a, b) => (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0));
    },

    getCardMap: () => cardLookup.ensure(get().cards).cardMap,

    moveCardsByIds: (cardIds, deltaX, deltaY) => set((state) => {
        if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY) || (deltaX === 0 && deltaY === 0)) {
            return state;
        }

        const moveIdSet = cardIds instanceof Set ? cardIds : new Set(cardIds || []);
        if (moveIdSet.size === 0) return state;

        const { indexById } = cardLookup.ensure(state.cards);
        const nextCards = state.cards.slice();
        const updatedCards = [];

        moveIdSet.forEach((cardId) => {
            const index = indexById.get(cardId);
            if (index === undefined) return;
            const card = nextCards[index];
            if (!card || card.deletedAt) return;

            const nextCard = {
                ...card,
                x: (card.x || 0) + deltaX,
                y: (card.y || 0) + deltaY
            };

            nextCards[index] = nextCard;
            updatedCards.push(nextCard);
        });

        if (updatedCards.length === 0) return state;

        cardLookup.patch(nextCards, updatedCards);
        return {
            cards: nextCards,
            cardIndexMutation: buildCardIndexMutation(state, {
                mode: 'patch',
                scope: 'geometry',
                updatedCards,
                reason: 'moveCardsByIds'
            })
        };
    }),

    setExpandedCardId: (id) => {
        debugLog.ui(`Focusing/Expanding card: ${id}`);
        set({ expandedCardId: id });
    },

    addCard: (card) => {
        const newCard = normalizeCardTimestamps(card);
        debugLog.store(`Adding new card: ${newCard.id}`, newCard);
        set((state) => {
            const nextCards = [...state.cards, newCard];
            cardLookup.rebuild(nextCards);
            return {
                cards: nextCards,
                cardIndexMutation: buildCardIndexMutation(state, {
                    mode: 'bulk',
                    reason: 'addCard'
                })
            };
        });
        // Removed: position-based auto-add to zone
        // Cards now only join zones via connections
    },

    updateCard: (id, updater) => {
        debugLog.store(`Updating card data: ${id}`, updater);
        set((state) => {
            const { indexById } = cardLookup.ensure(state.cards);
            const index = indexById.get(id);
            if (index === undefined) return state;

            const nextCards = state.cards.slice();
            const currentCard = nextCards[index];
            const updatedData = typeof updater === 'function'
                ? updater(currentCard.data)
                : updater;

            nextCards[index] = {
                ...currentCard,
                data: { ...currentCard.data, ...updatedData }
            };

            const updatedCard = nextCards[index];
            cardLookup.patch(nextCards, [updatedCard]);
            return {
                cards: nextCards,
                cardIndexMutation: buildCardIndexMutation(state, {
                    mode: 'patch',
                    scope: 'geometry',
                    updatedCards: [updatedCard],
                    reason: 'updateCard'
                })
            };
        });
    },

    // Special handler for the component refactor
    updateCardFull: (id, updater) => {
        debugLog.store(`Full update for card: ${id}`, updater);
        set((state) => {
            const { indexById } = cardLookup.ensure(state.cards);
            const index = indexById.get(id);
            if (index === undefined) return state;

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

            const updatedCard = nextCards[index];
            cardLookup.patch(nextCards, [updatedCard]);
            return {
                cards: nextCards,
                cardIndexMutation: buildCardIndexMutation(state, {
                    mode: 'patch',
                    scope: 'geometry',
                    updatedCards: [updatedCard],
                    reason: 'updateCardFull'
                })
            };
        });
    },

    // Soft delete: mark card as deleted instead of removing
    deleteCard: (id) => {
        debugLog.store(`Soft deleting card: ${id}`);
        set((state) => {
            const nextGenerating = new Set(state.generatingCardIds);
            nextGenerating.delete(id);
            const nextSelected = state.selectedIds ? state.selectedIds.filter(sid => sid !== id) : [];
            const { indexById } = cardLookup.ensure(state.cards);
            const index = indexById.get(id);
            const nextCards = state.cards.slice();
            const patchedCards = [];
            if (index !== undefined) {
                nextCards[index] = { ...nextCards[index], deletedAt: Date.now() };
                patchedCards.push(nextCards[index]);
            }
            if (patchedCards.length > 0) {
                cardLookup.patch(nextCards, patchedCards);
            }

            return {
                cards: index === undefined ? state.cards : nextCards,
                cardIndexMutation: patchedCards.length > 0
                    ? buildCardIndexMutation(state, {
                        mode: 'patch',
                        scope: 'geometry',
                        updatedCards: patchedCards,
                        reason: 'deleteCard'
                    })
                    : state.cardIndexMutation,
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
            const { indexById } = cardLookup.ensure(state.cards);
            const index = indexById.get(id);
            if (index === undefined) return state;

            const nextCards = state.cards.slice();
            nextCards[index] = { ...nextCards[index], deletedAt: undefined };

            const updatedCard = nextCards[index];
            cardLookup.patch(nextCards, [updatedCard]);
            return {
                cards: nextCards,
                cardIndexMutation: buildCardIndexMutation(state, {
                    mode: 'patch',
                    scope: 'geometry',
                    updatedCards: [updatedCard],
                    reason: 'restoreCard'
                })
            };
        });
    },

    // Permanently delete a card (used for cleanup after retention period)
    permanentlyDeleteCard: (id) => {
        debugLog.store(`Permanently deleting card: ${id}`);
        set((state) => {
            const nextCards = state.cards.filter(c => c.id !== id);
            cardLookup.rebuild(nextCards);
            return {
                cards: nextCards,
                cardIndexMutation: buildCardIndexMutation(state, {
                    mode: 'bulk',
                    reason: 'permanentlyDeleteCard'
                })
            };
        });
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

            set(state => {
                const nextCards = state.cards.map(card => {
                    const newPos = newPositions.get(card.id);
                    if (newPos) {
                        return { ...card, x: newPos.x, y: newPos.y };
                    }
                    return card;
                });
                cardLookup.rebuild(nextCards);
                return {
                    cards: nextCards,
                    cardIndexMutation: buildCardIndexMutation(state, {
                        mode: 'patch',
                        scope: 'geometry',
                        updatedCards: nextCards.filter((card) => newPositions.has(card.id)),
                        reason: 'arrangeCards:group-grid'
                    })
                };
            });
            return;
        }

        // 2. No Groups: Smart Choice
        if (connections && connections.length > 0) {
            // Existing Mind Map Logic
            const newPositions = calculateLayout(cards, connections);
            if (newPositions.size === 0) return;

            set(state => {
                const nextCards = state.cards.map(card => {
                    const newPos = newPositions.get(card.id);
                    if (newPos) {
                        return { ...card, x: newPos.x, y: newPos.y };
                    }
                    return card;
                });
                cardLookup.rebuild(nextCards);
                return {
                    cards: nextCards,
                    cardIndexMutation: buildCardIndexMutation(state, {
                        mode: 'patch',
                        scope: 'geometry',
                        updatedCards: nextCards.filter((card) => newPositions.has(card.id)),
                        reason: 'arrangeCards:layout'
                    })
                };
            });
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

            set(state => {
                const nextCards = state.cards.map(card => {
                    const newPos = newPositions.get(card.id);
                    if (newPos) {
                        return { ...card, x: newPos.x, y: newPos.y };
                    }
                    return card;
                });
                cardLookup.rebuild(nextCards);
                return {
                    cards: nextCards,
                    cardIndexMutation: buildCardIndexMutation(state, {
                        mode: 'patch',
                        scope: 'geometry',
                        updatedCards: nextCards.filter((card) => newPositions.has(card.id)),
                        reason: 'arrangeCards:grid'
                    })
                };
            });
        }
    },

    handleCardMove: (id, newX, newY, moveWithConnections = false) => {
        const { cards, connections, selectedIds } = get();
        const sourceCard = get().getCardById(id);
        if (!sourceCard) return;

        const dx = newX - sourceCard.x;
        const dy = newY - sourceCard.y;
        if (dx === 0 && dy === 0) return;
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
            debugLog.error("Invalid move delta detected", { dx, dy });
            return;
        }

        const moveIds = resolveDraggedCardIds({
            cardId: id,
            selectedIds,
            connections,
            moveWithConnections
        });
        get().moveCardsByIds(moveIds, dx, dy);
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
    resetCardState: () => {
        cardLookup.clear();
	        set({
	            cards: [],
                cardIndexMutation: createCardIndexMutation(),
	            expandedCardId: null,
	            lastSavedAt: 0,
	            activeBoardPersistence: {
	                updatedAt: 0,
	                clientRevision: 0,
	                dirty: false
	            },
                lastExternalSyncMarker: {
                    token: 0,
                    boardId: '',
                    fingerprint: '',
                    updatedAt: 0,
                    clientRevision: 0
                }
	        });
	    }
	    };
};
