import { normalizeBoardSnapshot } from '../boardSnapshot';

const BODY_CHANGE_TYPES = new Set([
    'card_body_content'
]);

const pickCardBodyFields = (card = {}) => {
    if (!card || typeof card !== 'object') return card;

    const nextData = {};
    if (card.data && typeof card.data === 'object') {
        if (Object.prototype.hasOwnProperty.call(card.data, 'title')) {
            nextData.title = card.data.title;
        }
        if (Object.prototype.hasOwnProperty.call(card.data, 'messages')) {
            nextData.messages = card.data.messages;
        }
        if (Object.prototype.hasOwnProperty.call(card.data, 'content')) {
            nextData.content = card.data.content;
        }
    }

    return {
        id: card.id,
        data: nextData
    };
};

const mergeBodyCard = (currentCard, incomingCard) => {
    if (!currentCard) {
        return null;
    }

    return {
        ...currentCard,
        data: {
            ...(currentCard.data || {}),
            ...(incomingCard.data || {})
        }
    };
};

export const isBodySyncChangeType = (changeType = '') => BODY_CHANGE_TYPES.has(changeType);

export const buildBodySyncSnapshot = ({
    cards = [],
    clientRevision = 0,
    updatedAt = 0
} = {}) => normalizeBoardSnapshot({
    cards: cards.map(pickCardBodyFields),
    clientRevision,
    updatedAt
});

export const mergeBodySnapshot = (currentSnapshot = {}, incomingSnapshot = {}) => {
    const current = normalizeBoardSnapshot(currentSnapshot);
    const incoming = normalizeBoardSnapshot(incomingSnapshot);
    const currentById = new Map(
        current.cards.map((card) => [card?.id, card])
    );
    const seenIds = new Set();

    const cards = incoming.cards.map((incomingCard) => {
        const cardId = incomingCard?.id;
        if (!cardId) {
            return null;
        }

        seenIds.add(cardId);
        return mergeBodyCard(currentById.get(cardId), incomingCard);
    }).filter(Boolean);

    current.cards.forEach((currentCard) => {
        const cardId = currentCard?.id;
        if (!cardId || seenIds.has(cardId)) {
            return;
        }

        cards.push(currentCard);
    });

    return normalizeBoardSnapshot({
        ...current,
        cards,
        clientRevision: Math.max(
            Number(current.clientRevision) || 0,
            Number(incoming.clientRevision) || 0
        ),
        updatedAt: Math.max(
            Number(current.updatedAt) || 0,
            Number(incoming.updatedAt) || 0
        )
    });
};
