const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const cloneSerializable = (value) => {
    if (value == null || typeof value !== 'object') {
        return value;
    }

    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};

const normalizeMessageList = (messages) => (
    Array.isArray(messages) ? messages.filter(Boolean) : []
);

const normalizeArrayContent = (content) => (
    Array.isArray(content) ? content.filter(Boolean) : []
);

const getAttachmentParts = (content) => normalizeArrayContent(content)
    .filter((part) => part?.type !== 'text');

const buildPartDedupKey = (part) => {
    try {
        return JSON.stringify(part);
    } catch {
        return String(part?.type || 'unknown');
    }
};

const mergeAttachmentParts = (currentContent, incomingContent) => {
    const merged = [];
    const seen = new Set();

    [...getAttachmentParts(currentContent), ...getAttachmentParts(incomingContent)].forEach((part) => {
        const key = buildPartDedupKey(part);
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(cloneSerializable(part));
    });

    return merged;
};

const coerceStringOrArrayText = (content) => {
    if (typeof content === 'string') {
        return content;
    }

    if (!Array.isArray(content)) {
        return '';
    }

    return content
        .filter((part) => part?.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('');
};

const mergeMessageContentAddWins = (currentContent, incomingContent) => {
    if (currentContent == null) {
        return cloneSerializable(incomingContent);
    }

    if (incomingContent == null) {
        return cloneSerializable(currentContent);
    }

    const currentText = coerceStringOrArrayText(currentContent);
    const incomingText = coerceStringOrArrayText(incomingContent);
    const mergedText = incomingText.length >= currentText.length
        ? incomingText
        : currentText;

    if (!Array.isArray(currentContent) && !Array.isArray(incomingContent)) {
        return mergedText;
    }

    const attachments = mergeAttachmentParts(currentContent, incomingContent);
    if (attachments.length === 0) {
        return mergedText;
    }

    return [
        { type: 'text', text: mergedText },
        ...attachments
    ];
};

const mergeMessageAddWins = (currentMessage, incomingMessage) => {
    if (!isObject(currentMessage)) {
        return cloneSerializable(incomingMessage);
    }

    if (!isObject(incomingMessage)) {
        return cloneSerializable(currentMessage);
    }

    return {
        ...cloneSerializable(currentMessage),
        ...cloneSerializable(incomingMessage),
        content: mergeMessageContentAddWins(currentMessage.content, incomingMessage.content)
    };
};

export const mergeConversationMessagesAddWins = (currentMessages, incomingMessages) => {
    const currentList = normalizeMessageList(currentMessages);
    const incomingList = normalizeMessageList(incomingMessages);

    if (currentList.length === 0) {
        return cloneSerializable(incomingList);
    }

    if (incomingList.length === 0) {
        return cloneSerializable(currentList);
    }

    const merged = [];
    const maxLength = Math.max(currentList.length, incomingList.length);

    for (let index = 0; index < maxLength; index += 1) {
        const currentMessage = currentList[index];
        const incomingMessage = incomingList[index];

        if (currentMessage && incomingMessage) {
            merged.push(mergeMessageAddWins(currentMessage, incomingMessage));
            continue;
        }

        merged.push(cloneSerializable(currentMessage || incomingMessage));
    }

    return merged;
};

export const protectHighValueCardContent = (currentCard, incomingCard) => {
    if (!isObject(incomingCard)) {
        return cloneSerializable(currentCard);
    }

    if (!isObject(currentCard)) {
        return cloneSerializable(incomingCard);
    }

    const currentMessages = currentCard?.data?.messages;
    const incomingMessages = incomingCard?.data?.messages;
    const hasCurrentMessages = Array.isArray(currentMessages) && currentMessages.length > 0;
    const hasIncomingMessages = Array.isArray(incomingMessages);

    if (!hasCurrentMessages && !hasIncomingMessages) {
        return cloneSerializable(incomingCard);
    }

    const nextCard = cloneSerializable(incomingCard);
    nextCard.data = {
        ...(isObject(incomingCard.data) ? nextCard.data : {}),
        messages: mergeConversationMessagesAddWins(currentMessages, incomingMessages)
    };

    return nextCard;
};
