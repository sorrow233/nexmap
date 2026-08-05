const CARD_CLIPBOARD_VERSION = 1;
const CARD_CLIPBOARD_STORAGE_KEY = 'mixboard_card_clipboard_v1';
const REPEATED_PASTE_OFFSET_PX = 24;

let memoryClipboard = null;
let pasteSequence = 0;

const cloneSerializable = (value) => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};

const getSessionStorage = () => {
    try {
        return typeof sessionStorage === 'undefined' ? null : sessionStorage;
    } catch {
        return null;
    }
};

export const stripCardRuntimeBodyState = (card) => {
    if (!card?.data?.runtimeBodyState) {
        return card;
    }

    const { runtimeBodyState, ...nextData } = card.data;
    return {
        ...card,
        data: nextData
    };
};

const normalizeClipboardPayload = (payload) => {
    if (
        payload?.version !== CARD_CLIPBOARD_VERSION
        || !Array.isArray(payload.cards)
        || payload.cards.length === 0
    ) {
        return null;
    }

    return {
        version: CARD_CLIPBOARD_VERSION,
        sourceBoardId: typeof payload.sourceBoardId === 'string' ? payload.sourceBoardId : '',
        copiedAt: Number(payload.copiedAt) || Date.now(),
        cards: payload.cards.filter((card) => card?.id)
    };
};

export const writeCardClipboard = (cards = [], { sourceBoardId = '' } = {}) => {
    const clipboardCards = (Array.isArray(cards) ? cards : [])
        .filter((card) => card?.id)
        .map(stripCardRuntimeBodyState);
    if (clipboardCards.length === 0) return 0;

    const payload = {
        version: CARD_CLIPBOARD_VERSION,
        sourceBoardId,
        copiedAt: Date.now(),
        cards: cloneSerializable(clipboardCards)
    };
    memoryClipboard = payload;
    pasteSequence = 0;

    const storage = getSessionStorage();
    if (storage) {
        try {
            storage.setItem(CARD_CLIPBOARD_STORAGE_KEY, JSON.stringify(payload));
        } catch {
            try {
                storage.removeItem(CARD_CLIPBOARD_STORAGE_KEY);
            } catch {
                // The in-memory clipboard remains available when storage is blocked or full.
            }
        }
    }

    return clipboardCards.length;
};

export const readCardClipboardForPaste = () => {
    if (!memoryClipboard) {
        const storage = getSessionStorage();
        if (storage) {
            try {
                memoryClipboard = normalizeClipboardPayload(
                    JSON.parse(storage.getItem(CARD_CLIPBOARD_STORAGE_KEY) || 'null')
                );
            } catch {
                memoryClipboard = null;
            }
        }
    }

    const payload = normalizeClipboardPayload(memoryClipboard);
    if (!payload) return null;

    const result = {
        ...cloneSerializable(payload),
        pasteSequence
    };
    pasteSequence += 1;
    return result;
};

export const buildPastedCardBatch = ({
    clipboardCards = [],
    offset = { x: 0, y: 0 },
    scale = 1,
    viewportWidth = 0,
    viewportHeight = 0,
    currentPasteSequence = 0,
    createId
} = {}) => {
    const sourceCards = (Array.isArray(clipboardCards) ? clipboardCards : [])
        .filter((card) => card?.id);
    if (sourceCards.length === 0 || typeof createId !== 'function') return [];

    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const sourcePositions = sourceCards.map((card, index) => ({
        x: Number.isFinite(card.x) ? card.x : index * 20,
        y: Number.isFinite(card.y) ? card.y : index * 20
    }));
    const sourceX = sourcePositions.map((position) => position.x);
    const sourceY = sourcePositions.map((position) => position.y);
    const sourceCenterX = (Math.min(...sourceX) + Math.max(...sourceX)) / 2;
    const sourceCenterY = (Math.min(...sourceY) + Math.max(...sourceY)) / 2;
    const repeatOffset = (Math.max(0, currentPasteSequence) * REPEATED_PASTE_OFFSET_PX) / safeScale;
    const targetCenterX = ((viewportWidth / 2) - (Number(offset.x) || 0)) / safeScale + repeatOffset;
    const targetCenterY = ((viewportHeight / 2) - (Number(offset.y) || 0)) / safeScale + repeatOffset;

    return sourceCards.map((card, index) => {
        const snapshot = cloneSerializable(stripCardRuntimeBodyState(card));
        return {
            ...snapshot,
            id: createId(),
            x: targetCenterX + sourcePositions[index].x - sourceCenterX,
            y: targetCenterY + sourcePositions[index].y - sourceCenterY,
            data: { ...(snapshot.data || {}) }
        };
    });
};

export const resetCardClipboardForTests = () => {
    memoryClipboard = null;
    pasteSequence = 0;
};
