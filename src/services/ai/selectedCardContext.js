const MAX_CONTEXT_CARDS = 6;
const MAX_MESSAGES_PER_CARD = 4;
const MAX_MESSAGE_CHARS = 600;
const MAX_TOTAL_CONTEXT_CHARS = 6000;

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

const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
};

export const buildSelectedCardsContext = (cards = []) => {
    if (!Array.isArray(cards) || cards.length === 0) {
        return '';
    }

    const selectedCards = cards.slice(0, MAX_CONTEXT_CARDS);
    const sections = [];
    let totalChars = 0;

    for (const card of selectedCards) {
        const title = card?.data?.title || 'Untitled';
        const messages = Array.isArray(card?.data?.messages) ? card.data.messages.slice(-MAX_MESSAGES_PER_CARD) : [];

        const messageLines = [];
        for (const message of messages) {
            const content = truncateText(stringifyMessageContent(message?.content), MAX_MESSAGE_CHARS);
            if (!content) continue;

            const line = `${message?.role || 'user'}: ${content}`;
            if (totalChars + line.length > MAX_TOTAL_CONTEXT_CHARS) {
                break;
            }

            messageLines.push(line);
            totalChars += line.length;
        }

        if (messageLines.length === 0) continue;

        const section = `--- Card: "${title}" ---\n${messageLines.join('\n')}`;
        if (totalChars + section.length > MAX_TOTAL_CONTEXT_CHARS && sections.length > 0) {
            break;
        }

        sections.push(section);
        totalChars += section.length;

        if (totalChars >= MAX_TOTAL_CONTEXT_CHARS) {
            break;
        }
    }

    if (sections.length === 0) {
        return '';
    }

    return `${sections.join('\n\n')}\n\n---\n\nBased on the above context, please respond to:\n\n`;
};
