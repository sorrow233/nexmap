const toPositiveMillis = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

export const createCardTimestampFields = (now = Date.now()) => {
    const safeNow = toPositiveMillis(now) || Date.now();
    return {
        createdAt: safeNow,
        updatedAt: safeNow
    };
};

export const normalizeCardTimestamps = (card = {}, options = {}) => {
    if (!card || typeof card !== 'object') return card;

    const boardCreatedAt = toPositiveMillis(options.boardCreatedAt);
    const rawCreatedAt = toPositiveMillis(card.createdAt);
    const rawUpdatedAt = toPositiveMillis(card.updatedAt);

    let createdAt = 0;
    let updatedAt = 0;

    if (rawCreatedAt && rawUpdatedAt) {
        createdAt = Math.min(rawCreatedAt, rawUpdatedAt);
        updatedAt = Math.max(rawCreatedAt, rawUpdatedAt);
    } else if (rawCreatedAt) {
        createdAt = rawCreatedAt;
        updatedAt = rawCreatedAt;
    } else if (rawUpdatedAt) {
        createdAt = boardCreatedAt ? Math.min(boardCreatedAt, rawUpdatedAt) : rawUpdatedAt;
        updatedAt = rawUpdatedAt;
    } else if (boardCreatedAt) {
        createdAt = boardCreatedAt;
        updatedAt = boardCreatedAt;
    }

    if (createdAt === rawCreatedAt && updatedAt === rawUpdatedAt) {
        return card;
    }

    const nextCard = { ...card };
    if (createdAt > 0) {
        nextCard.createdAt = createdAt;
    } else {
        delete nextCard.createdAt;
    }

    if (updatedAt > 0) {
        nextCard.updatedAt = updatedAt;
    } else {
        delete nextCard.updatedAt;
    }

    return nextCard;
};

export const normalizeCardsTimestamps = (cards = [], options = {}) => (
    Array.isArray(cards)
        ? cards.map((card) => normalizeCardTimestamps(card, options))
        : []
);
