import {
    cloneSerializable,
    normalizeBoardSnapshot
} from '../boardSnapshot';

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const hashString = (input = '') => {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
};

const pickCardBodyData = (card = {}) => {
    const nextData = {};
    const cardData = card?.data && typeof card.data === 'object' ? card.data : {};

    if (hasOwn(cardData, 'messages')) {
        nextData.messages = cloneSerializable(cardData.messages);
    }
    if (hasOwn(cardData, 'content')) {
        nextData.content = cloneSerializable(cardData.content);
    }
    if (hasOwn(cardData, 'image')) {
        nextData.image = cloneSerializable(cardData.image);
    }
    if (hasOwn(cardData, 'text')) {
        nextData.text = cloneSerializable(cardData.text);
    }

    return nextData;
};

export const buildCardBodySyncHash = (cardOrEntry = {}) => {
    const payload = {
        messages: hasOwn(cardOrEntry, 'messages')
            ? cardOrEntry.messages
            : cardOrEntry?.data?.messages,
        content: hasOwn(cardOrEntry, 'content')
            ? cardOrEntry.content
            : cardOrEntry?.data?.content,
        image: hasOwn(cardOrEntry, 'image')
            ? cardOrEntry.image
            : cardOrEntry?.data?.image,
        text: hasOwn(cardOrEntry, 'text')
            ? cardOrEntry.text
            : cardOrEntry?.data?.text
    };

    return hashString(JSON.stringify(payload));
};

export const normalizeCardBodySyncEntry = (entry = {}) => {
    const normalizedEntry = {
        cardId: typeof entry.cardId === 'string' ? entry.cardId : (typeof entry.id === 'string' ? entry.id : ''),
        bodyUpdatedAt: Number(entry.bodyUpdatedAt) || 0,
        bodyRevision: Number(entry.bodyRevision) || 0
    };

    if (hasOwn(entry, 'messages')) {
        normalizedEntry.messages = cloneSerializable(entry.messages);
    }
    if (hasOwn(entry, 'content')) {
        normalizedEntry.content = cloneSerializable(entry.content);
    }
    if (hasOwn(entry, 'image')) {
        normalizedEntry.image = cloneSerializable(entry.image);
    }
    if (hasOwn(entry, 'text')) {
        normalizedEntry.text = cloneSerializable(entry.text);
    }

    normalizedEntry.bodyHash = typeof entry.bodyHash === 'string' && entry.bodyHash
        ? entry.bodyHash
        : buildCardBodySyncHash(normalizedEntry);

    return normalizedEntry.cardId ? normalizedEntry : null;
};

export const buildCardBodySyncEntry = (card = {}, metadata = {}) => {
    const cardId = typeof card?.id === 'string' ? card.id : '';
    if (!cardId) {
        return null;
    }

    const bodyData = pickCardBodyData(card);
    if (!hasOwn(bodyData, 'messages') && !hasOwn(bodyData, 'content') && !hasOwn(bodyData, 'image') && !hasOwn(bodyData, 'text')) {
        return null;
    }

    return normalizeCardBodySyncEntry({
        cardId,
        ...bodyData,
        bodyUpdatedAt: Number(metadata.bodyUpdatedAt ?? metadata.updatedAt) || 0,
        bodyRevision: Number(metadata.bodyRevision ?? metadata.clientRevision) || 0
    });
};

export const buildCardBodySyncEntries = (cards = [], metadata = {}) => (
    Array.isArray(cards)
        ? cards.map((card) => buildCardBodySyncEntry(card, metadata)).filter(Boolean)
        : []
);

export const buildCardBodyHashMap = (cards = []) => {
    const nextMap = new Map();
    buildCardBodySyncEntries(cards).forEach((entry) => {
        nextMap.set(entry.cardId, entry.bodyHash);
    });
    return nextMap;
};

export const buildChangedCardBodySyncJobs = ({
    cards = [],
    clientRevision = 0,
    updatedAt = 0
} = {}, previousHashes = new Map()) => {
    const nextHashes = new Map();
    const jobs = [];

    buildCardBodySyncEntries(cards, {
        clientRevision,
        updatedAt
    }).forEach((entry) => {
        nextHashes.set(entry.cardId, entry.bodyHash);
        if (previousHashes.get(entry.cardId) !== entry.bodyHash) {
            jobs.push(entry);
        }
    });

    return {
        jobs,
        nextHashes
    };
};

export const buildBodySyncSnapshotFromEntries = (entries = [], metadata = {}) => normalizeBoardSnapshot({
    cards: entries
        .map((entry) => normalizeCardBodySyncEntry(entry))
        .filter(Boolean)
        .map((entry) => {
            const nextCard = { id: entry.cardId, data: {} };
            if (hasOwn(entry, 'messages')) {
                nextCard.data.messages = cloneSerializable(entry.messages);
            }
            if (hasOwn(entry, 'content')) {
                nextCard.data.content = cloneSerializable(entry.content);
            }
            if (hasOwn(entry, 'image')) {
                nextCard.data.image = cloneSerializable(entry.image);
            }
            if (hasOwn(entry, 'text')) {
                nextCard.data.text = cloneSerializable(entry.text);
            }
            return nextCard;
        }),
    clientRevision: Number(metadata.clientRevision) || Math.max(
        0,
        ...entries.map((entry) => Number(entry?.bodyRevision) || 0)
    ),
    updatedAt: Number(metadata.updatedAt) || Math.max(
        0,
        ...entries.map((entry) => Number(entry?.bodyUpdatedAt) || 0)
    )
});

export const mergeCardBodyEntryIntoCard = (currentCard, entry = {}) => {
    if (!currentCard) {
        return null;
    }

    const normalizedEntry = normalizeCardBodySyncEntry(entry);
    if (!normalizedEntry) {
        return currentCard;
    }

    const nextData = {
        ...(currentCard.data || {})
    };

    if (hasOwn(normalizedEntry, 'messages')) {
        nextData.messages = cloneSerializable(normalizedEntry.messages);
    }
    if (hasOwn(normalizedEntry, 'content')) {
        nextData.content = cloneSerializable(normalizedEntry.content);
    }
    if (hasOwn(normalizedEntry, 'image')) {
        nextData.image = cloneSerializable(normalizedEntry.image);
    }
    if (hasOwn(normalizedEntry, 'text')) {
        nextData.text = cloneSerializable(normalizedEntry.text);
    }

    return {
        ...currentCard,
        data: nextData
    };
};

export const mergeCardBodyEntriesIntoSnapshot = (snapshot = {}, entries = []) => {
    const normalizedSnapshot = normalizeBoardSnapshot(snapshot);
    if (!Array.isArray(entries) || entries.length === 0) {
        return normalizedSnapshot;
    }

    const entriesById = new Map(
        entries
            .map((entry) => normalizeCardBodySyncEntry(entry))
            .filter(Boolean)
            .map((entry) => [entry.cardId, entry])
    );

    const cards = normalizedSnapshot.cards.map((card) => {
        const cardId = typeof card?.id === 'string' ? card.id : '';
        if (!cardId || !entriesById.has(cardId)) {
            return card;
        }

        return mergeCardBodyEntryIntoCard(card, entriesById.get(cardId));
    });

    return normalizeBoardSnapshot({
        ...normalizedSnapshot,
        cards,
        clientRevision: Math.max(
            Number(normalizedSnapshot.clientRevision) || 0,
            ...entries.map((entry) => Number(entry?.bodyRevision) || 0)
        ),
        updatedAt: Math.max(
            Number(normalizedSnapshot.updatedAt) || 0,
            ...entries.map((entry) => Number(entry?.bodyUpdatedAt) || 0)
        )
    });
};
