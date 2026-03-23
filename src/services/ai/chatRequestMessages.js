export const extractTextFromMessageContent = (content) => {
    if (typeof content === 'string') {
        return content;
    }

    if (Array.isArray(content)) {
        return content
            .filter((part) => part?.type === 'text')
            .map((part) => part?.text || '')
            .join('');
    }

    return '';
};

export const isMessageContentEmpty = (content) => {
    if (typeof content === 'string') {
        return content.trim().length === 0;
    }

    if (Array.isArray(content)) {
        const hasNonTextPayload = content.some((part) => (
            part?.type === 'image' || part?.type === 'image_url'
        ));
        if (hasNonTextPayload) {
            return false;
        }

        return extractTextFromMessageContent(content).trim().length === 0;
    }

    return !content;
};

export const sanitizeChatRequestMessages = (messages = []) => {
    if (!Array.isArray(messages) || messages.length === 0) {
        return [];
    }

    const nonEmptyMessages = messages.filter(Boolean).filter((message) => (
        message?.role !== 'assistant' || !isMessageContentEmpty(message?.content)
    ));

    let trimEnd = nonEmptyMessages.length;
    while (trimEnd > 0 && nonEmptyMessages[trimEnd - 1]?.role === 'assistant') {
        trimEnd -= 1;
    }

    return nonEmptyMessages.slice(0, trimEnd);
};
