const MAX_CHARS_PER_CARD = 100000;

const stringifyMessageContent = (content) => {
    if (typeof content === 'string') {
        return content;
    }

    if (!Array.isArray(content)) {
        return '';
    }

    return content
        .map((part) => {
            if (part?.type === 'text') return part.text || '';
            if (part?.type === 'image') return '[Image]';
            return '';
        })
        .filter(Boolean)
        .join(' ');
};

const truncateCardContext = (text) => {
    if (!text || text.length <= MAX_CHARS_PER_CARD) {
        return text;
    }

    return `${text.slice(0, MAX_CHARS_PER_CARD)}...`;
};

export const buildSelectedCardsContext = (cards = []) => {
    if (!Array.isArray(cards) || cards.length === 0) {
        return '';
    }

    const sections = cards
        .map((card) => {
        const title = card?.data?.title || 'Untitled';
        const messages = Array.isArray(card?.data?.messages) ? card.data.messages : [];
        const messageLines = messages
            .map((message) => {
                const content = stringifyMessageContent(message?.content);
                if (!content) return '';
                return `${message?.role || 'user'}: ${content}`;
            })
            .filter(Boolean);

        if (messageLines.length === 0) {
            return '';
        }

        return truncateCardContext(`--- Card: "${title}" ---\n${messageLines.join('\n')}`);
    })
        .filter(Boolean);

    if (sections.length === 0) {
        return '';
    }

    return `${sections.join('\n\n')}\n\n---\n\nBased on the above context, please respond to:\n\n`;
};
