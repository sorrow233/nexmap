const ROLE_LABELS = {
    user: 'User',
    assistant: 'Assistant',
    system: 'System',
    tool: 'Tool'
};

const cleanThinkingTags = (text = '') => (
    String(text || '').replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim()
);

const getImageReference = (part = {}) => {
    const source = part.source || {};
    const candidate = source.s3Url
        || source.url
        || part.image_url?.url
        || (typeof part.image_url === 'string' ? part.image_url : '');

    return typeof candidate === 'string' && candidate && !candidate.startsWith('data:')
        ? candidate
        : '';
};

export const getCardMessageClipboardText = (content) => {
    if (typeof content === 'string') {
        return cleanThinkingTags(content);
    }

    if (!Array.isArray(content)) {
        return content == null ? '' : String(content);
    }

    return content
        .map((part) => {
            if (!part || typeof part !== 'object') return '';
            if (['text', 'input_text', 'output_text'].includes(part.type)) {
                return String(part.text || '');
            }
            if (part.type === 'image' || part.type === 'image_url') {
                const imageReference = getImageReference(part);
                return imageReference ? `[Image] ${imageReference}` : '[Image]';
            }
            return typeof part.content === 'string' ? part.content : '';
        })
        .filter(Boolean)
        .join('\n')
        .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
        .trim();
};

export const buildFullCardClipboardText = (card = {}) => {
    const cardData = card.data || {};
    const title = (card.summary?.title || cardData.title || 'Untitled')
        .replace(/^#+\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/__/g, '')
        .replace(/^\d+\.\s*/, '')
        .trim() || 'Untitled';
    const messages = Array.isArray(cardData.messages) ? cardData.messages : [];

    if (messages.length > 0) {
        const conversation = messages.map((message, index) => {
            const role = ROLE_LABELS[message?.role]
                || String(message?.role || 'Message').replace(/^./, (letter) => letter.toUpperCase());
            const content = getCardMessageClipboardText(message?.content) || '(Empty)';
            return `[${index + 1}] ${role}\n${content}`;
        }).join('\n\n');

        return `${title}\n\n${conversation}`;
    }

    const bodyContent = typeof cardData.content === 'string'
        ? cardData.content.trim()
        : '';
    return `${title}\n\n${bodyContent || '(No messages)'}`;
};

export const resolveFullCardForClipboard = (card = {}, getCardById) => {
    const fullCard = typeof getCardById === 'function'
        ? getCardById(card.id) || card
        : card;

    if (fullCard.data?.runtimeBodyState?.hydrated === false) {
        throw new Error(`Full card body is unavailable for ${card.id || 'unknown card'}`);
    }

    return fullCard;
};

const writeTextWithLegacyFallback = (text) => {
    if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
        throw new Error('Clipboard API is unavailable');
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        if (!document.execCommand('copy')) {
            throw new Error('Legacy clipboard copy was rejected');
        }
    } finally {
        textarea.remove();
    }
};

export const writeCardTextToClipboard = async (text) => {
    if (globalThis.navigator?.clipboard?.writeText) {
        try {
            await globalThis.navigator.clipboard.writeText(text);
            return;
        } catch (error) {
            if (typeof document === 'undefined') throw error;
        }
    }

    writeTextWithLegacyFallback(text);
};
