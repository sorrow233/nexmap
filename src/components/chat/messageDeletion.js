import favoritesService from '../../services/favoritesService';

const DELETE_PREVIEW_LIMIT = 120;

export const extractMessageTextContent = (content) => {
    if (typeof content === 'string') {
        return content;
    }

    if (!Array.isArray(content)) {
        return '';
    }

    return content.reduce((result, part) => {
        if (part?.type === 'text' && typeof part.text === 'string') {
            return result + part.text;
        }

        return result;
    }, '');
};

const hasImagePart = (content) => (
    Array.isArray(content) && content.some((part) => part?.type === 'image')
);

export const buildDeleteMessageConfirmText = (message) => {
    const roleLabel = message?.role === 'assistant' ? 'AI 回复' : '用户消息';
    const rawPreview = extractMessageTextContent(message?.content).trim();
    const fallbackPreview = hasImagePart(message?.content) ? '[图片消息]' : '';
    const preview = rawPreview || fallbackPreview;
    const compactPreview = preview.length > DELETE_PREVIEW_LIMIT
        ? `${preview.slice(0, DELETE_PREVIEW_LIMIT)}...`
        : preview;

    return [
        `确认删除这条${roleLabel}吗？`,
        '删除后它会立刻从当前会话移除，后续上下文也不会再带上它。',
        compactPreview ? `预览：${compactPreview}` : ''
    ].filter(Boolean).join('\n\n');
};

export const removeMessageFromCardData = (currentData, { messageId = null, messageIndex = -1 } = {}) => {
    if (!currentData || !Array.isArray(currentData.messages)) {
        return currentData;
    }

    const nextMessages = currentData.messages.filter((message, index) => {
        if (messageId && message?.id) {
            return message.id !== messageId;
        }

        return index !== messageIndex;
    });

    if (nextMessages.length === currentData.messages.length) {
        return currentData;
    }

    return {
        ...currentData,
        messages: nextMessages
    };
};

export const removeMessageFavoriteSnapshot = ({ cardId, message, messageIndex }) => {
    if (!cardId || !message) {
        return;
    }

    favoritesService.removeFavorite(
        cardId,
        message?.id || null,
        messageIndex,
        message?.content
    );
};
