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
import {
    compressCardBodyPayload,
    extractCardBodyPayload,
    hasCardBodyPayload,
    decompressCardBodyPayload
} from './cardBodyCompression';

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
        nextDoc.bodyEncoding = deleteField();
        nextDoc.compressedBody = deleteField();
        nextDoc.messages = deleteField();
        nextDoc.content = deleteField();
        nextDoc.image = deleteField();
        nextDoc.text = deleteField();
        return nextDoc;
    }

    let compressedPayload = null;
    try {
        compressedPayload = compressCardBodyPayload(normalizedEntry);
    } catch (error) {
        const details = error?.message ? `: ${error.message}` : '';
        throw new Error(`Card body ${normalizedEntry.cardId} compression failed${details}`);
    }

    if (!compressedPayload) {
        return null;
    }

    nextDoc.bodyEncoding = compressedPayload.bodyEncoding;
    nextDoc.compressedBody = compressedPayload.compressedBody;
    nextDoc.messages = deleteField();
    nextDoc.content = deleteField();
    nextDoc.image = deleteField();
    nextDoc.text = deleteField();

    return nextDoc;
};

const fromFirestoreBodyDoc = (cardId, data = {}) => {
    if (data?.bodyCleared === true) {
        return normalizeCardBodySyncEntry({
            cardId,
            bodyCleared: true,
            bodyUpdatedAt: data?.bodyUpdatedAt,
            bodyRevision: data?.bodyRevision,
            bodyHash: data?.bodyHash,
            lastDeviceId: data?.lastDeviceId
        });
    }

    const compressedPayload = decompressCardBodyPayload({
        bodyEncoding: data?.bodyEncoding,
        compressedBody: data?.compressedBody
    });

    const fallbackPayload = extractCardBodyPayload(data);
    const payload = compressedPayload || (hasCardBodyPayload(fallbackPayload) ? fallbackPayload : null);

    if (data?.bodyEncoding && !compressedPayload) {
        if (payload) {
            console.warn(`[FirestoreCardBodyStore] Failed to decompress card body ${cardId}, falling back to legacy plain fields`);
        } else {
            console.error(`[FirestoreCardBodyStore] Failed to decompress card body ${cardId}`);
            return null;
        }
    }

    return normalizeCardBodySyncEntry({
        cardId,
        ...(payload || {}),
        bodyUpdatedAt: data?.bodyUpdatedAt,
        bodyRevision: data?.bodyRevision,
        bodyHash: data?.bodyHash,
        lastDeviceId: data?.lastDeviceId
    });
};

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
            if (!nextDoc) {
                offset += 1;
                continue;
            }
            const nextBytes = estimateEntryBytes(nextDoc);

            if (nextBytes > MAX_CARD_BODY_DOC_BYTES) {
                throw new Error(`Card body ${entry.cardId} exceeds Firestore safe document size after compression`);
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

        if (docCount === 0) {
            continue;
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
