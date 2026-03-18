import { isRectIntersect } from './geometry';
import { applyCardPositionOverride } from './cardDrag';

const ZONE_PADDING_X = 80;
const ZONE_PADDING_Y = 80;
const EMPTY_POSITION_OVERRIDES = new Map();

const getZoneCardMetrics = (card) => {
    const x = card.x || 0;
    const y = card.y || 0;
    let width = card.type === 'note' ? (card.width || 280) : 400;
    let height = card.type === 'note' ? (card.height || 280) : 200;

    if (card.type !== 'note') {
        const messageCount = card.data?.messages?.length || 0;
        height = Math.min(200 + (messageCount * 50), 800);
    }

    if (card.width) width = card.width;
    if (card.height) height = card.height;

    return { x, y, width, height };
};

export function buildGroupData(group, cardMap, positionOverrides = EMPTY_POSITION_OVERRIDES) {
    const groupCards = (group.cardIds || [])
        .map((id) => cardMap.get(id))
        .map((card) => applyCardPositionOverride(card, positionOverrides))
        .filter((card) => card && !card.deletedAt);

    if (groupCards.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let messageCount = 0;

    groupCards.forEach((card) => {
        const { x, y, width, height } = getZoneCardMetrics(card);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
        messageCount += card.data?.messages?.length || 0;
    });

    return {
        group,
        rect: {
            x: minX - ZONE_PADDING_X,
            y: minY - ZONE_PADDING_Y - 40,
            width: (maxX - minX) + (ZONE_PADDING_X * 2),
            height: (maxY - minY) + (ZONE_PADDING_Y * 2) + 40
        },
        stats: {
            cardCount: groupCards.length,
            messageCount
        }
    };
}

export function createGroupGeometryCache() {
    return new Map();
}

const getCachedGroupData = (cache, group, cardMap, positionOverrides = EMPTY_POSITION_OVERRIDES) => {
    const activeCards = (group.cardIds || [])
        .map((id) => cardMap.get(id))
        .filter((card) => card && !card.deletedAt);

    if (!cache || (positionOverrides && positionOverrides.size > 0)) {
        return activeCards.length === 0 ? null : buildGroupData(group, cardMap, positionOverrides);
    }

    const cachedEntry = cache.get(group.id);
    const canReuse = cachedEntry &&
        cachedEntry.group === group &&
        cachedEntry.cards.length === activeCards.length &&
        cachedEntry.cards.every((card, index) => card === activeCards[index]);

    if (canReuse) {
        return cachedEntry.data;
    }

    const data = activeCards.length === 0 ? null : buildGroupData(group, cardMap, positionOverrides);
    cache.set(group.id, {
        group,
        cards: activeCards,
        data
    });
    return data;
};

export function getVisibleGroups(
    groups,
    cardMap,
    viewportRect,
    alwaysVisibleCardIds = new Set(),
    cache = null,
    positionOverrides = EMPTY_POSITION_OVERRIDES
) {
    if (!groups || groups.length === 0) return [];

    const visibleGroups = [];
    const activeGroupIds = cache ? new Set() : null;

    groups.forEach((group) => {
        if (activeGroupIds) {
            activeGroupIds.add(group.id);
        }
        const groupData = getCachedGroupData(cache, group, cardMap, positionOverrides);
        if (!groupData) return;

        const hasAlwaysVisibleCard = (group.cardIds || []).some((id) => alwaysVisibleCardIds.has(id));
        const groupRect = {
            left: groupData.rect.x,
            top: groupData.rect.y,
            right: groupData.rect.x + groupData.rect.width,
            bottom: groupData.rect.y + groupData.rect.height
        };

        if (hasAlwaysVisibleCard || isRectIntersect(viewportRect, groupRect)) {
            visibleGroups.push(groupData);
        }
    });

    if (cache && activeGroupIds && (!positionOverrides || positionOverrides.size === 0)) {
        Array.from(cache.keys()).forEach((groupId) => {
            if (!activeGroupIds.has(groupId)) {
                cache.delete(groupId);
            }
        });
    }

    return visibleGroups;
}
