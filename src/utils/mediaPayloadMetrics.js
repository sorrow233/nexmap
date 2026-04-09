const DATA_URL_BASE64_MARKER_RE = /^data:.*?;base64,/i;

export const estimateBase64Bytes = (base64Data = '') => {
    if (!base64Data) return 0;

    const normalized = String(base64Data);
    const len = normalized.length;
    let padding = 0;

    if (normalized.endsWith('==')) padding = 2;
    else if (normalized.endsWith('=')) padding = 1;

    return Math.max(0, Math.floor((len * 3) / 4) - padding);
};

export const estimateDataUrlBytes = (value = '') => {
    const normalized = String(value || '');
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

const estimateInlineImagePartBytes = (part = {}) => {
    if (part?.type === 'image') {
        return estimateBase64Bytes(part?.source?.data || '');
    }

    if (part?.type === 'image_url') {
        return estimateDataUrlBytes(part?.image_url?.url || '');
    }

    return 0;
};

const isImagePart = (part = {}) => (
    part?.type === 'image' || part?.type === 'image_url'
);

export const estimateMessageContentInlineMediaBytes = (content) => {
    if (!Array.isArray(content)) {
        return 0;
    }

    return content.reduce((total, part) => total + estimateInlineImagePartBytes(part), 0);
};

export const countMessageContentImages = (content) => {
    if (!Array.isArray(content)) {
        return 0;
    }

    return content.reduce((total, part) => total + (isImagePart(part) ? 1 : 0), 0);
};

export const estimateCardInlineMediaBytes = (card = {}) => {
    const data = card?.data || {};
    const noteImageBytes = typeof data.image === 'string'
        ? estimateDataUrlBytes(data.image)
        : 0;
    const messages = Array.isArray(data.messages) ? data.messages : [];

    return noteImageBytes + messages.reduce((total, message) => (
        total + estimateMessageContentInlineMediaBytes(message?.content)
    ), 0);
};

export const countCardImages = (card = {}) => {
    const data = card?.data || {};
    const noteImageCount = typeof data.image === 'string' && data.image ? 1 : 0;
    const messages = Array.isArray(data.messages) ? data.messages : [];

    return noteImageCount + messages.reduce((total, message) => (
        total + countMessageContentImages(message?.content)
    ), 0);
};
