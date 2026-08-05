import { idbGet, idbSet } from './db/indexedDB.js';

const CARD_CLIPBOARD_VERSION = 2;
const CARD_CLIPBOARD_STORAGE_KEY = 'mixboard_card_clipboard_v2';
const CARD_CLIPBOARD_IDB_KEY = 'mixboard_card_clipboard_shared_v2';

let memoryClipboard = null;
let pasteSequence = 0;

const cloneSerializable = (value) => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};

const getStorage = (storageName) => {
    try {
        return typeof window === 'undefined' ? null : window[storageName];
    } catch {
        return null;
    }
};

const getSessionStorage = () => getStorage('sessionStorage');
const getLocalStorage = () => getStorage('localStorage');

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
        ![1, CARD_CLIPBOARD_VERSION].includes(payload?.version)
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

    [getSessionStorage(), getLocalStorage()].forEach((storage) => {
        if (!storage) return;
        try {
            storage.setItem(CARD_CLIPBOARD_STORAGE_KEY, JSON.stringify(payload));
        } catch {
            try {
                storage.removeItem(CARD_CLIPBOARD_STORAGE_KEY);
            } catch {
                // The in-memory clipboard remains available when storage is blocked or full.
            }
        }
    });

    void idbSet(CARD_CLIPBOARD_IDB_KEY, payload).catch(() => {
        // Synchronous memory/storage copies still support paste if IndexedDB is unavailable.
    });

    return clipboardCards.length;
};

const readClipboardFromStorage = (storage) => {
    if (!storage) return null;
    try {
        return normalizeClipboardPayload(
            JSON.parse(storage.getItem(CARD_CLIPBOARD_STORAGE_KEY) || 'null')
        );
    } catch {
        return null;
    }
};

const pickNewestClipboard = (candidates = []) => candidates
    .map(normalizeClipboardPayload)
    .filter(Boolean)
    .reduce((newest, candidate) => (
        !newest || candidate.copiedAt >= newest.copiedAt ? candidate : newest
    ), null);

const createPasteRead = (payload) => {
    const normalizedPayload = normalizeClipboardPayload(payload);
    if (!normalizedPayload) return null;

    memoryClipboard = normalizedPayload;
    const result = {
        ...cloneSerializable(normalizedPayload),
        pasteSequence
    };
    pasteSequence += 1;
    return result;
};

export const readCardClipboardForPaste = () => createPasteRead(pickNewestClipboard([
    memoryClipboard,
    readClipboardFromStorage(getSessionStorage()),
    readClipboardFromStorage(getLocalStorage())
]));

export const readCardClipboardForPasteAsync = async () => {
    let indexedDbClipboard = null;
    try {
        indexedDbClipboard = await idbGet(CARD_CLIPBOARD_IDB_KEY);
    } catch {
        indexedDbClipboard = null;
    }

    return createPasteRead(pickNewestClipboard([
        memoryClipboard,
        readClipboardFromStorage(getSessionStorage()),
        readClipboardFromStorage(getLocalStorage()),
        indexedDbClipboard
    ]));
};

export const resetCardClipboardForTests = () => {
    memoryClipboard = null;
    pasteSequence = 0;
};
