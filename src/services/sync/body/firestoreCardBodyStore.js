import {
    deleteField,
    getDocs,
    onSnapshot,
    serverTimestamp,
    setDoc,
    writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
    createCardBodiesCollectionRef,
    createCardBodyRef
} from './firestoreCardBodyPaths';
import { normalizeCardBodySyncEntry } from './cardBodySyncProtocol';

const WRITE_BATCH_MAX_DOCS = 6;
const WRITE_BATCH_MAX_BYTES = 4 * 1024 * 1024;
const MAX_CARD_BODY_DOC_BYTES = 900 * 1024;
const INTER_BATCH_DELAY_MS = 120;
const RETRYABLE_ERROR_CODES = new Set([
    'resource-exhausted',
    'unavailable',
    'aborted'
]);

const estimateEntryBytes = (entry = {}) => {
    try {
        return new TextEncoder().encode(JSON.stringify(entry)).length + 1024;
    } catch {
        return 1024;
    }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const commitWithRetry = async (commitBatch, attempt = 0) => {
    try {
        return await commitBatch();
    } catch (error) {
        const code = typeof error?.code === 'string' ? error.code : '';
        if (!RETRYABLE_ERROR_CODES.has(code) || attempt >= 3) {
            throw error;
        }

        await delay(200 * (attempt + 1));
        return commitWithRetry(commitBatch, attempt + 1);
    }
};

const toFirestoreBodyDoc = (entry = {}, deviceId = '') => {
    const normalizedEntry = normalizeCardBodySyncEntry(entry);
    if (!normalizedEntry) {
        return null;
    }

    const nextDoc = {
        cardId: normalizedEntry.cardId,
        bodyUpdatedAt: normalizedEntry.bodyUpdatedAt,
        bodyRevision: normalizedEntry.bodyRevision,
        bodyHash: normalizedEntry.bodyHash,
        bodyCleared: false,
        lastDeviceId: deviceId,
        serverUpdatedAt: serverTimestamp()
    };

    if (normalizedEntry.bodyCleared === true) {
        nextDoc.bodyCleared = true;
        nextDoc.messages = deleteField();
        nextDoc.content = deleteField();
        nextDoc.image = deleteField();
        nextDoc.text = deleteField();
        return nextDoc;
    }

    if (Object.prototype.hasOwnProperty.call(normalizedEntry, 'messages')) {
        nextDoc.messages = normalizedEntry.messages;
    }
    if (Object.prototype.hasOwnProperty.call(normalizedEntry, 'content')) {
        nextDoc.content = normalizedEntry.content;
    }
    if (Object.prototype.hasOwnProperty.call(normalizedEntry, 'image')) {
        nextDoc.image = normalizedEntry.image;
    }
    if (Object.prototype.hasOwnProperty.call(normalizedEntry, 'text')) {
        nextDoc.text = normalizedEntry.text;
    }

    return nextDoc;
};

const fromFirestoreBodyDoc = (cardId, data = {}) => normalizeCardBodySyncEntry({
    cardId,
    ...(Object.prototype.hasOwnProperty.call(data || {}, 'messages') ? { messages: data.messages } : {}),
    ...(Object.prototype.hasOwnProperty.call(data || {}, 'content') ? { content: data.content } : {}),
    ...(Object.prototype.hasOwnProperty.call(data || {}, 'image') ? { image: data.image } : {}),
    ...(Object.prototype.hasOwnProperty.call(data || {}, 'text') ? { text: data.text } : {}),
    ...(data?.bodyCleared === true ? { bodyCleared: true } : {}),
    bodyUpdatedAt: data?.bodyUpdatedAt,
    bodyRevision: data?.bodyRevision,
    bodyHash: data?.bodyHash,
    lastDeviceId: data?.lastDeviceId
});

export const saveCardBodyEntries = async ({
    userId,
    boardId,
    deviceId,
    entries = []
} = {}) => {
    if (!db || !userId || !boardId || !Array.isArray(entries) || entries.length === 0) {
        return [];
    }

    const normalizedEntries = entries
        .map((entry) => normalizeCardBodySyncEntry(entry))
        .filter(Boolean);

    const committedCardIds = [];
    let offset = 0;

    while (offset < normalizedEntries.length) {
        const batch = writeBatch(db);
        let docCount = 0;
        let byteLength = 0;

        while (offset < normalizedEntries.length) {
            const entry = normalizedEntries[offset];
            const nextDoc = toFirestoreBodyDoc(entry, deviceId);
            const nextBytes = estimateEntryBytes(nextDoc);

            if (nextBytes > MAX_CARD_BODY_DOC_BYTES) {
                throw new Error(`Card body ${entry.cardId} exceeds Firestore safe document size`);
            }

            if (
                docCount > 0
                && (docCount >= WRITE_BATCH_MAX_DOCS || (byteLength + nextBytes) > WRITE_BATCH_MAX_BYTES)
            ) {
                break;
            }

            batch.set(
                createCardBodyRef(userId, boardId, entry.cardId),
                nextDoc,
                { merge: true }
            );

            committedCardIds.push(entry.cardId);
            docCount += 1;
            byteLength += nextBytes;
            offset += 1;
        }

        await commitWithRetry(() => batch.commit());

        if (offset < normalizedEntries.length) {
            await delay(INTER_BATCH_DELAY_MS);
        }
    }

    return committedCardIds;
};

export const loadCardBodyEntries = async ({
    userId,
    boardId
} = {}) => {
    if (!db || !userId || !boardId) {
        return [];
    }

    const snapshot = await getDocs(createCardBodiesCollectionRef(userId, boardId));
    return snapshot.docs
        .map((docSnap) => fromFirestoreBodyDoc(docSnap.id, docSnap.data()))
        .filter(Boolean);
};

export const subscribeToCardBodyEntries = ({
    userId,
    boardId,
    onEntries,
    onError
} = {}) => {
    if (!db || !userId || !boardId || typeof onEntries !== 'function') {
        return () => {};
    }

    return onSnapshot(
        createCardBodiesCollectionRef(userId, boardId),
        (snapshot) => {
            const entries = snapshot.docChanges()
                .filter((change) => change.type !== 'removed')
                .map((change) => fromFirestoreBodyDoc(change.doc.id, change.doc.data()))
                .filter(Boolean);

            if (entries.length > 0) {
                onEntries(entries);
            }
        },
        (error) => {
            onError?.(error);
        }
    );
};
