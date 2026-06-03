import { saveImageToIDB } from '../imageStore';
import { uuid } from '../../utils/uuid';

const IMAGE_PERSIST_CONCURRENCY = 2;

export const estimateBase64Bytes = (base64Data = '') => {
    if (!base64Data) return 0;
    const len = String(base64Data).length;
    let padding = 0;
    if (base64Data.endsWith('==')) padding = 2;
    else if (base64Data.endsWith('=')) padding = 1;
    return Math.max(0, Math.floor((len * 3) / 4) - padding);
};

const buildTextPart = (text) => ({
    type: 'text',
    text
});

const normalizeMediaType = (image = {}) => (
    image?.mimeType
    || image?.source?.media_type
    || image?.source?.mimeType
    || 'image/png'
);

const buildInlineImagePart = (image) => ({
    type: 'image',
    source: {
        media_type: normalizeMediaType(image),
        data: image?.base64 || image?.source?.data || ''
    }
});

const buildIdbImagePart = (imageId, image) => ({
    type: 'image',
    source: {
        type: 'idb',
        id: imageId,
        media_type: normalizeMediaType(image),
        ...(Number.isFinite(image?.sizeBytes) ? { sizeBytes: image.sizeBytes } : {})
    }
});

const retrySaveImageToIDB = async (imageId, base64Data, attempts = 2) => {
    let lastError = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            const saved = await saveImageToIDB(imageId, base64Data);
            if (saved) return true;
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) {
        console.warn('[AI Message Content] Failed to persist image to IDB after retries', lastError);
    }
    return false;
};

const runWithConcurrency = async (items = [], concurrency = 1, worker) => {
    const results = new Array(items.length);
    let nextIndex = 0;

    const runWorker = async () => {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await worker(items[index], index);
        }
    };

    const workerCount = Math.min(Math.max(1, concurrency), items.length);
    await Promise.all(Array.from({ length: workerCount }, runWorker));
    return results;
};

const getImageSource = (image = {}) => (
    image?.type === 'image' && image?.source
        ? image.source
        : null
);

const isUrlLikeImageSource = (source = {}) => (
    Boolean(source?.s3Url || source?.url || source?.type === 'url' || source?.media_type === 'url')
);

export const isInlineBase64ImagePart = (part = {}) => {
    const source = part?.source;
    return (
        part?.type === 'image' &&
        source &&
        !isUrlLikeImageSource(source) &&
        source.type !== 'idb' &&
        typeof source.data === 'string' &&
        source.data.length > 0
    );
};

const buildPersistedImageId = ({ cardId = 'card', messageId = 'message', index = 0 } = {}) => (
    `${cardId || 'card'}_img_${messageId || 'message'}_${uuid()}_${index}`
);

const normalizeExistingImagePart = (image = {}) => {
    const source = getImageSource(image);
    if (!source) return null;

    if (source.type === 'idb' && source.id) {
        return {
            type: 'image',
            source: {
                type: 'idb',
                id: source.id,
                media_type: source.media_type || normalizeMediaType(image),
                ...(Number.isFinite(source.sizeBytes) ? { sizeBytes: source.sizeBytes } : {})
            }
        };
    }

    if (isUrlLikeImageSource(source)) {
        return {
            type: 'image',
            source: {
                ...source,
                media_type: source.media_type || normalizeMediaType(image)
            }
        };
    }

    return null;
};

export const prepareImageForMessageStorage = async (image, context = {}) => {
    if (!image) return null;

    const existingPart = normalizeExistingImagePart(image);
    if (existingPart) return existingPart;

    const base64Data = image?.base64 || image?.source?.data || '';
    if (!base64Data) return null;

    const sizeBytes = estimateBase64Bytes(base64Data);
    const imageId = buildPersistedImageId(context);
    const saved = await retrySaveImageToIDB(imageId, base64Data);

    if (saved) {
        return buildIdbImagePart(imageId, {
            ...image,
            sizeBytes
        });
    }

    return buildInlineImagePart(image);
};

export const prepareImagesForMessageStorage = async ({
    cardId,
    messageId,
    images = []
} = {}) => {
    const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
    if (safeImages.length === 0) return [];

    const prepared = await runWithConcurrency(
        safeImages,
        IMAGE_PERSIST_CONCURRENCY,
        (image, index) => prepareImageForMessageStorage(image, {
            cardId,
            messageId,
            index
        })
    );

    return prepared.filter(Boolean);
};

export const createMessageContentWithImages = (text = '', images = [], prefix = '') => {
    const finalText = `${prefix || ''}${text || ''}`;
    if (!Array.isArray(images) || images.length === 0) {
        return finalText;
    }

    return [
        buildTextPart(finalText),
        ...images.filter(Boolean).map((image) => (
            normalizeExistingImagePart(image) || buildInlineImagePart(image)
        ))
    ];
};

export const createPersistedMessageContentWithImages = async ({
    text = '',
    images = [],
    prefix = '',
    cardId,
    messageId
} = {}) => {
    const finalText = `${prefix || ''}${text || ''}`;
    const imageParts = await prepareImagesForMessageStorage({
        cardId,
        messageId,
        images
    });

    if (imageParts.length === 0) {
        return finalText;
    }

    return [
        buildTextPart(finalText),
        ...imageParts
    ];
};

export const persistCardMessageImagesToIDB = async ({
    cardId,
    messageId,
    images = [],
    updateCardFull
}) => {
    if (!cardId || !messageId || !Array.isArray(images) || images.length === 0 || typeof updateCardFull !== 'function') {
        return false;
    }

    const persistedImageParts = await prepareImagesForMessageStorage({
        cardId,
        messageId,
        images
    });
    if (persistedImageParts.length === 0) {
        return false;
    }

    updateCardFull(cardId, (currentData = {}) => {
        const existingMessages = Array.isArray(currentData.messages) ? currentData.messages : [];
        const messageIndex = existingMessages.findIndex((message) => message?.id === messageId);
        if (messageIndex === -1) return currentData;

        const nextMessages = existingMessages.slice();
        const currentMessage = nextMessages[messageIndex];
        const currentContent = currentMessage?.content;
        const textPart = Array.isArray(currentContent)
            ? currentContent.find((part) => part?.type === 'text')
            : null;
        const fallbackText = typeof currentContent === 'string' ? currentContent : '';

        nextMessages[messageIndex] = {
            ...currentMessage,
            content: [
                buildTextPart(textPart?.text || fallbackText),
                ...persistedImageParts
            ]
        };

        return {
            ...currentData,
            messages: nextMessages
        };
    });

    return true;
};

export const hasInlineBase64MessageImages = (messages = []) => (
    (Array.isArray(messages) ? messages : []).some((message) => (
        Array.isArray(message?.content) && message.content.some(isInlineBase64ImagePart)
    ))
);

export const getInlineImageMigrationSignature = (messages = []) => {
    const stats = (Array.isArray(messages) ? messages : []).reduce((acc, message) => {
        if (!Array.isArray(message?.content)) return acc;

        message.content.forEach((part) => {
            if (!isInlineBase64ImagePart(part)) return;
            acc.count += 1;
            acc.base64Chars += part.source.data.length;
        });

        return acc;
    }, { count: 0, base64Chars: 0 });

    return `${stats.count}:${stats.base64Chars}`;
};

export const migrateInlineMessageImagesToIDB = async ({
    cardId,
    messages = []
} = {}) => {
    const tasks = [];

    (Array.isArray(messages) ? messages : []).forEach((message, messageIndex) => {
        if (!Array.isArray(message?.content)) return;

        message.content.forEach((part, partIndex) => {
            if (!isInlineBase64ImagePart(part)) return;

            tasks.push({
                messageId: message?.id || null,
                messageIndex,
                partIndex,
                part
            });
        });
    });

    if (tasks.length === 0) return [];

    const replacements = await runWithConcurrency(tasks, 1, async (task) => {
        const nextPart = await prepareImageForMessageStorage(task.part, {
            cardId,
            messageId: task.messageId || `message_${task.messageIndex}`,
            index: task.partIndex
        });

        if (nextPart?.source?.type !== 'idb') return null;

        return {
            messageId: task.messageId,
            messageIndex: task.messageIndex,
            partIndex: task.partIndex,
            part: nextPart
        };
    });

    return replacements.filter(Boolean);
};

export const applyInlineImageMigrationsToCardData = (currentData = {}, replacements = []) => {
    if (!Array.isArray(currentData?.messages) || !Array.isArray(replacements) || replacements.length === 0) {
        return currentData;
    }

    const replacementByMessageKey = new Map();
    replacements.forEach((replacement) => {
        const key = replacement.messageId || `index:${replacement.messageIndex}`;
        if (!replacementByMessageKey.has(key)) {
            replacementByMessageKey.set(key, new Map());
        }
        replacementByMessageKey.get(key).set(replacement.partIndex, replacement.part);
    });

    let didChange = false;
    const nextMessages = currentData.messages.map((message, messageIndex) => {
        if (!Array.isArray(message?.content)) return message;

        const key = message?.id || `index:${messageIndex}`;
        const replacementsForMessage = replacementByMessageKey.get(key);
        if (!replacementsForMessage) return message;

        let didMessageChange = false;
        const nextContent = message.content.map((part, partIndex) => {
            const replacementPart = replacementsForMessage.get(partIndex);
            if (!replacementPart || !isInlineBase64ImagePart(part)) {
                return part;
            }

            didMessageChange = true;
            return replacementPart;
        });

        if (!didMessageChange) return message;
        didChange = true;
        return {
            ...message,
            content: nextContent
        };
    });

    if (!didChange) return currentData;

    return {
        ...currentData,
        messages: nextMessages
    };
};
