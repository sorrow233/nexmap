import { getConnectedGraph } from './graphUtils';

export function resolveDraggedCardIds({
    cardId,
    selectedIds = [],
    connections = [],
    moveWithConnections = false
}) {
    const selectedIdSet = new Set(selectedIds || []);
    const isSelected = selectedIdSet.has(cardId);

    if (!moveWithConnections) {
        return isSelected ? selectedIdSet : new Set([cardId]);
    }

    const sourceIds = isSelected ? [...selectedIdSet] : [cardId];
    const moveIds = new Set();

    sourceIds.forEach((sourceId) => {
        const connectedIds = getConnectedGraph(sourceId, connections || []);
        connectedIds.forEach((connectedId) => moveIds.add(connectedId));
    });

    return moveIds;
}

export function buildCardPositionOverrides(cards = [], moveIds = new Set(), dx = 0, dy = 0) {
    const overrides = new Map();

    if (!moveIds || moveIds.size === 0) return overrides;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return overrides;

    cards.forEach((card) => {
        if (!moveIds.has(card.id)) return;
        overrides.set(card.id, {
            x: card.x + dx,
            y: card.y + dy
        });
    });

    return overrides;
}

export function buildCardPositionOverridesFromMap(cardMap = new Map(), moveIds = new Set(), dx = 0, dy = 0) {
    const overrides = new Map();

    if (!moveIds || moveIds.size === 0) return overrides;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return overrides;

    moveIds.forEach((id) => {
        const card = cardMap.get(id);
        if (!card) return;

        overrides.set(id, {
            x: card.x + dx,
            y: card.y + dy
        });
    });

    return overrides;
}

export function applyCardPositionOverridesToList(cards = [], positionOverrides = new Map()) {
    if (!positionOverrides || positionOverrides.size === 0) return cards;

    const nextCards = cards.slice();

    cards.forEach((card, index) => {
        const override = positionOverrides.get(card.id);
        if (!override) return;

        nextCards[index] = {
            ...card,
            x: override.x,
            y: override.y
        };
    });

    return nextCards;
}

export function applyCardPositionOverride(card, positionOverrides = new Map()) {
    if (!card || !positionOverrides || positionOverrides.size === 0) return card;

    const override = positionOverrides.get(card.id);
    if (!override) return card;

    return {
        ...card,
        x: override.x,
        y: override.y
    };
}
