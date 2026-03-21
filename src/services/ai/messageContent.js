import { saveImageToIDB } from '../imageStore';
import { uuid } from '../../utils/uuid';

const buildTextPart = (text) => ({
    type: 'text',
    text
});

const buildInlineImagePart = (image) => ({
    type: 'image',
    source: {
        media_type: image?.mimeType || 'image/png',
        data: image?.base64 || ''
    }
});

const buildIdbImagePart = (imageId, image) => ({
    type: 'image',
    source: {
        type: 'idb',
        id: imageId,
        media_type: image?.mimeType || 'image/png'
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

export const createMessageContentWithImages = (text = '', images = [], prefix = '') => {
    const finalText = `${prefix || ''}${text || ''}`;
    if (!Array.isArray(images) || images.length === 0) {
        return finalText;
    }

    return [
        buildTextPart(finalText),
        ...images.filter(Boolean).map(buildInlineImagePart)
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

    const persistedImageParts = [];

    for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        if (!image?.base64) continue;

        const imageId = `${cardId}_img_${uuid()}_${index}`;
        const saved = await retrySaveImageToIDB(imageId, image.base64);
        if (!saved) {
            return false;
        }

        persistedImageParts.push(buildIdbImagePart(imageId, image));
    }

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
