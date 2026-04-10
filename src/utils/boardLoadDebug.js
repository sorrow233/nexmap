const DATA_URL_BASE64_MARKER_RE = /^data:.*?;base64,/i;
const HEAVY_SNAPSHOT_MEDIA_BYTES = 2 * 1024 * 1024;
const HEAVY_SNAPSHOT_IMAGE_COUNT = 3;
const HEAVY_SNAPSHOT_CARD_COUNT = 12;
const BOARD_LOAD_DEBUG_STORAGE_KEY = 'mixboard_debug_board_load';

const toSafeString = (value = '') => String(value || '');

const estimateBase64Bytes = (base64Data = '') => {
    const normalized = toSafeString(base64Data);
    if (!normalized) return 0;

    let padding = 0;
    if (normalized.endsWith('==')) padding = 2;
    else if (normalized.endsWith('=')) padding = 1;

    return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
};

const estimateDataUrlBytes = (value = '') => {
    const normalized = toSafeString(value);
    if (!normalized) return 0;

    const commaIndex = normalized.indexOf(',');
    if (commaIndex === -1) {
        return DATA_URL_BASE64_MARKER_RE.test(normalized)
            ? estimateBase64Bytes(normalized)
            : 0;
    }

    const metadata = normalized.slice(0, commaIndex + 1);
    if (!DATA_URL_BASE64_MARKER_RE.test(metadata)) {
        return 0;
    }

    return estimateBase64Bytes(normalized.slice(commaIndex + 1));
};

const inspectMessageContent = (content) => {
    if (!Array.isArray(content)) {
        return {
            imageCount: 0,
            inlineMediaBytes: 0
        };
    }

    return content.reduce((acc, part) => {
        if (part?.type === 'image') {
            acc.imageCount += 1;
            acc.inlineMediaBytes += estimateBase64Bytes(part?.source?.data || '');
        } else if (part?.type === 'image_url') {
            const maybeDataUrlBytes = estimateDataUrlBytes(part?.image_url?.url || '');
            if (maybeDataUrlBytes > 0) {
                acc.imageCount += 1;
                acc.inlineMediaBytes += maybeDataUrlBytes;
            }
        }
        return acc;
    }, {
        imageCount: 0,
        inlineMediaBytes: 0
    });
};

export const inspectBoardSnapshotLoadMetrics = (snapshot = {}) => {
    const cards = Array.isArray(snapshot?.cards) ? snapshot.cards : [];

    let inlineMediaBytes = 0;
    let imageCount = 0;
    let messageCount = 0;
    let maxCardMediaBytes = 0;
    let maxCardId = '';

    cards.forEach((card) => {
        const data = card?.data || {};
        const messages = Array.isArray(data.messages) ? data.messages : [];
        messageCount += messages.length;

        let cardMediaBytes = typeof data.image === 'string'
            ? estimateDataUrlBytes(data.image)
            : 0;
        let cardImageCount = cardMediaBytes > 0 ? 1 : 0;

        messages.forEach((message) => {
            const inspected = inspectMessageContent(message?.content);
            cardMediaBytes += inspected.inlineMediaBytes;
            cardImageCount += inspected.imageCount;
        });

        inlineMediaBytes += cardMediaBytes;
        imageCount += cardImageCount;

        if (cardMediaBytes > maxCardMediaBytes) {
            maxCardMediaBytes = cardMediaBytes;
            maxCardId = typeof card?.id === 'string' ? card.id : '';
        }
    });

    return {
        cardCount: cards.length,
        messageCount,
        imageCount,
        inlineMediaBytes,
        maxCardMediaBytes,
        maxCardId,
        updatedAt: Number(snapshot?.updatedAt) || 0,
        clientRevision: Number(snapshot?.clientRevision) || 0
    };
};

export const shouldLogHeavySnapshot = (metrics = {}) => (
    metrics.inlineMediaBytes >= HEAVY_SNAPSHOT_MEDIA_BYTES
    || metrics.imageCount >= HEAVY_SNAPSHOT_IMAGE_COUNT
    || metrics.cardCount >= HEAVY_SNAPSHOT_CARD_COUNT
);

const bytesToMB = (bytes = 0) => Number(bytes / (1024 * 1024)).toFixed(2);

const isBoardLoadDebugEnabled = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    if (window.__MIXBOARD_BOARD_LOAD_DEBUG__ === true) {
        return true;
    }

    try {
        return window.localStorage?.getItem(BOARD_LOAD_DEBUG_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
};

export const logBoardLoadStage = (stage, snapshot = {}, extra = {}) => {
    if (typeof window === 'undefined' || !isBoardLoadDebugEnabled()) {
        return;
    }

    const metrics = inspectBoardSnapshotLoadMetrics(snapshot);
    if (!shouldLogHeavySnapshot(metrics)) {
        return;
    }

    console.warn('[BoardLoadDebug]', stage, {
        ...metrics,
        inlineMediaMB: bytesToMB(metrics.inlineMediaBytes),
        maxCardMediaMB: bytesToMB(metrics.maxCardMediaBytes),
        ...extra
    });
};
