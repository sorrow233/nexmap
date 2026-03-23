const hasMeaningfulMessageContent = (content) => {
    if (typeof content === 'string') {
        return content.trim().length > 0;
    }

    if (Array.isArray(content)) {
        return content.some((part) => {
            if (!part || typeof part !== 'object') return false;

            if (part.type === 'text') {
                return typeof part.text === 'string' && part.text.trim().length > 0;
            }

            if (part.type === 'image') {
                return Boolean(part.source?.data || part.source?.id || part.image_url?.url);
            }

            return true;
        });
    }

    return content !== undefined && content !== null;
};

export const sanitizeMessagesForGeneration = (messages = []) => {
    if (!Array.isArray(messages) || messages.length === 0) {
        return [];
    }

    let endIndex = messages.length;

    // Some providers reject assistant-prefill and require the conversation to end
    // with a user turn. The UI may append an empty assistant placeholder locally
    // before the request starts, so strip any trailing assistant turn here.
    while (endIndex > 0 && messages[endIndex - 1]?.role === 'assistant') {
        endIndex -= 1;
    }

    const trimmedMessages = endIndex === messages.length
        ? messages
        : messages.slice(0, endIndex);

    return trimmedMessages.filter((message) => {
        if (!message || typeof message !== 'object') return false;
        if (!message.role) return false;

        if (message.role !== 'assistant') {
            return true;
        }

        return hasMeaningfulMessageContent(message.content);
    });
};
