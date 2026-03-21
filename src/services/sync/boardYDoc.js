import * as Y from 'yjs';
import diffMatch from 'fast-diff';
import {
    getEmptyBoardSnapshot,
    normalizeBoardSnapshot
} from './boardSnapshot';

const ROOT_KEYS = [
    'cards',
    'connections',
    'groups',
    'boardPrompts',
    'boardInstructionSettings',
    'updatedAt',
    'clientRevision'
];

const TEXT_PATH_PATTERNS = [
    ['cards', '*', 'data', 'title'],
    ['cards', '*', 'summary', 'title'],
    ['cards', '*', 'summary', 'summary'],
    ['cards', '*', 'data', 'messages', '*', 'content'],
    ['cards', '*', 'data', 'messages', '*', 'content', '*', 'text'],
    ['boardPrompts', '*', 'text'],
    ['boardPrompts', '*', 'content']
];

const isPrimitive = (value) => value == null || ['string', 'number', 'boolean'].includes(typeof value);

const pathMatchesPattern = (path = [], pattern = []) => {
    if (path.length !== pattern.length) return false;
    for (let i = 0; i < pattern.length; i += 1) {
        if (pattern[i] !== '*' && pattern[i] !== path[i]) {
            return false;
        }
    }
    return true;
};

const shouldUseYText = (path = [], value) => (
    typeof value === 'string' &&
    TEXT_PATH_PATTERNS.some((pattern) => pathMatchesPattern(path, pattern))
);

const createTextNode = (value = '') => {
    const ytext = new Y.Text();
    if (value) {
        ytext.insert(0, value);
    }
    return ytext;
};

const applyTextDiff = (ytext, nextValue = '') => {
    const currentText = ytext.toString();
    if (currentText === nextValue) return;

    const patches = diffMatch(currentText, nextValue);
    let cursor = 0;

    patches.forEach(([op, text]) => {
        if (!text) return;
        if (op === 0) {
            cursor += text.length;
            return;
        }
        if (op === -1) {
            ytext.delete(cursor, text.length);
            return;
        }
        ytext.insert(cursor, text);
        cursor += text.length;
    });
};

const createNodeFromValue = (value, path = []) => {
    if (Array.isArray(value)) {
        const yarray = new Y.Array();
        yarray.insert(0, value.map((item, index) => createNodeFromValue(item, [...path, String(index)])));
        return yarray;
    }

    if (value && typeof value === 'object') {
        const ymap = new Y.Map();
        Object.entries(value).forEach(([key, nextValue]) => {
            ymap.set(key, createNodeFromValue(nextValue, [...path, key]));
        });
        return ymap;
    }

    if (shouldUseYText(path, value)) {
        return createTextNode(value);
    }

    return value ?? null;
};

const replaceArrayValue = (yarray, index, nextValue, path = []) => {
    yarray.delete(index, 1);
    yarray.insert(index, [createNodeFromValue(nextValue, path)]);
};

const getCardId = (card) => (
    card && typeof card === 'object' && typeof card.id === 'string' && card.id.trim()
        ? card.id.trim()
        : ''
);

const getCardUpdatedAt = (card) => {
    if (!card || typeof card !== 'object') return 0;
    const updatedAt = Number(card.updatedAt);
    if (Number.isFinite(updatedAt) && updatedAt > 0) {
        return updatedAt;
    }

    const createdAt = Number(card.createdAt);
    return Number.isFinite(createdAt) && createdAt > 0 ? createdAt : 0;
};

const getCardDeletedAt = (card) => {
    if (!card || typeof card !== 'object') return 0;
    const deletedAt = Number(card.deletedAt);
    return Number.isFinite(deletedAt) && deletedAt > 0 ? deletedAt : 0;
};

const shouldPreferIncomingCard = (currentCard, incomingCard) => {
    if (!currentCard) return true;

    const currentDeletedAt = getCardDeletedAt(currentCard);
    const incomingDeletedAt = getCardDeletedAt(incomingCard);
    if (currentDeletedAt !== incomingDeletedAt) {
        return incomingDeletedAt > currentDeletedAt;
    }

    const currentUpdatedAt = getCardUpdatedAt(currentCard);
    const incomingUpdatedAt = getCardUpdatedAt(incomingCard);
    if (currentUpdatedAt !== incomingUpdatedAt) {
        return incomingUpdatedAt >= currentUpdatedAt;
    }

    return true;
};

const mergeCardSnapshots = (currentCards = [], nextCards = []) => {
    const currentById = new Map();
    currentCards.forEach((card) => {
        const cardId = getCardId(card);
        if (cardId) {
            currentById.set(cardId, card);
        }
    });

    const seenIds = new Set();
    const mergedCards = nextCards.map((incomingCard) => {
        const cardId = getCardId(incomingCard);
        if (!cardId) {
            return incomingCard;
        }

        seenIds.add(cardId);
        const currentCard = currentById.get(cardId);
        return shouldPreferIncomingCard(currentCard, incomingCard)
            ? incomingCard
            : currentCard;
    });

    currentCards.forEach((currentCard) => {
        const cardId = getCardId(currentCard);
        if (!cardId || seenIds.has(cardId)) {
            return;
        }

        // Missing card ids are preserved; only an explicit deletedAt update may retire them.
        mergedCards.push(currentCard);
    });

    return mergedCards;
};

const syncObjectToYMap = (ymap, nextObject = {}, path = []) => {
    const nextKeys = new Set(Object.keys(nextObject));

    Array.from(ymap.keys()).forEach((key) => {
        if (!nextKeys.has(key)) {
            ymap.delete(key);
        }
    });

    Object.entries(nextObject).forEach(([key, nextValue]) => {
        syncValueIntoParent(ymap, key, nextValue, [...path, key]);
    });
};

const syncArrayToYArray = (yarray, nextArray = [], path = []) => {
    while (yarray.length > nextArray.length) {
        yarray.delete(yarray.length - 1, 1);
    }

    nextArray.forEach((nextValue, index) => {
        const nextPath = [...path, String(index)];
        if (index >= yarray.length) {
            yarray.insert(index, [createNodeFromValue(nextValue, nextPath)]);
            return;
        }

        const currentValue = yarray.get(index);
        if (currentValue instanceof Y.Map && nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue)) {
            syncObjectToYMap(currentValue, nextValue, nextPath);
            return;
        }

        if (currentValue instanceof Y.Array && Array.isArray(nextValue)) {
            syncArrayToYArray(currentValue, nextValue, nextPath);
            return;
        }

        if (currentValue instanceof Y.Text && shouldUseYText(nextPath, nextValue)) {
            applyTextDiff(currentValue, nextValue);
            return;
        }

        if (currentValue === nextValue) {
            return;
        }

        replaceArrayValue(yarray, index, nextValue, nextPath);
    });
};

const syncValueIntoParent = (parent, key, nextValue, path = []) => {
    if (parent instanceof Y.Map) {
        const currentValue = parent.get(key);

        if (currentValue instanceof Y.Map && nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue)) {
            syncObjectToYMap(currentValue, nextValue, path);
            return;
        }

        if (currentValue instanceof Y.Array && Array.isArray(nextValue)) {
            syncArrayToYArray(currentValue, nextValue, path);
            return;
        }

        if (currentValue instanceof Y.Text && shouldUseYText(path, nextValue)) {
            applyTextDiff(currentValue, nextValue);
            return;
        }

        if (currentValue === nextValue) return;
        parent.set(key, createNodeFromValue(nextValue, path));
        return;
    }

    if (parent instanceof Y.Array) {
        if (key >= parent.length) {
            parent.insert(key, [createNodeFromValue(nextValue, path)]);
            return;
        }

        const currentValue = parent.get(key);
        if (currentValue instanceof Y.Map && nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue)) {
            syncObjectToYMap(currentValue, nextValue, path);
            return;
        }

        if (currentValue instanceof Y.Array && Array.isArray(nextValue)) {
            syncArrayToYArray(currentValue, nextValue, path);
            return;
        }

        if (currentValue instanceof Y.Text && shouldUseYText(path, nextValue)) {
            applyTextDiff(currentValue, nextValue);
            return;
        }

        if (currentValue === nextValue) return;
        replaceArrayValue(parent, key, nextValue, path);
    }
};

const readNodeToValue = (node, path = []) => {
    if (node instanceof Y.Map) {
        const next = {};
        Array.from(node.keys()).forEach((key) => {
            next[key] = readNodeToValue(node.get(key), [...path, key]);
        });
        return next;
    }

    if (node instanceof Y.Array) {
        return node.toArray().map((item, index) => readNodeToValue(item, [...path, String(index)]));
    }

    if (node instanceof Y.Text) {
        return node.toString();
    }

    return node;
};

export const createBoardDoc = () => {
    const doc = new Y.Doc();
    const root = doc.getMap('board');
    ROOT_KEYS.forEach((key) => {
        if (!root.has(key)) {
            root.set(key, createNodeFromValue(getEmptyBoardSnapshot()[key], [key]));
        }
    });
    return doc;
};

export const syncBoardSnapshotToDoc = (doc, snapshot = {}) => {
    const normalized = normalizeBoardSnapshot(snapshot);
    const root = doc.getMap('board');

    doc.transact(() => {
        const currentCards = root.has('cards')
            ? readNodeToValue(root.get('cards'), ['cards'])
            : [];
        syncValueIntoParent(root, 'cards', mergeCardSnapshots(currentCards, normalized.cards), ['cards']);

        ROOT_KEYS.filter((key) => key !== 'cards').forEach((key) => {
            syncValueIntoParent(root, key, normalized[key], [key]);
        });
    });
};

export const readBoardSnapshotFromDoc = (doc) => {
    const root = doc.getMap('board');
    const next = {};
    ROOT_KEYS.forEach((key) => {
        next[key] = root.has(key) ? readNodeToValue(root.get(key), [key]) : getEmptyBoardSnapshot()[key];
    });
    return normalizeBoardSnapshot(next);
};

export const isBoardDocEmpty = (doc) => {
    const snapshot = readBoardSnapshotFromDoc(doc);
    return (
        snapshot.cards.length === 0 &&
        snapshot.connections.length === 0 &&
        snapshot.groups.length === 0 &&
        snapshot.boardPrompts.length === 0
    );
};
