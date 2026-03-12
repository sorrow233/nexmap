import { isRectIntersect } from './geometry';

const ZONE_PADDING_X = 80;
const ZONE_PADDING_Y = 80;

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

export function buildGroupData(group, cardMap) {
    const groupCards = (group.cardIds || [])
        .map((id) => cardMap.get(id))
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

export function getVisibleGroups(groups, cardMap, viewportRect, alwaysVisibleCardIds = new Set()) {
    if (!groups || groups.length === 0) return [];

    const visibleGroups = [];

    groups.forEach((group) => {
        const groupData = buildGroupData(group, cardMap);
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

    return visibleGroups;
}
