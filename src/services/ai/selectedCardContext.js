import { extractMessageContentText } from '../../utils/boardPerformance';

const MAX_SELECTED_CONTEXT_CARDS = 3;
const MAX_CHARS_PER_CARD = 8_000;
const MAX_TOTAL_CONTEXT_CHARS = 24_000;

const truncateCardContextFromTail = (text) => {
    if (!text || text.length <= MAX_CHARS_PER_CARD) {
        return text;
    }

    return `...${text.slice(-MAX_CHARS_PER_CARD)}`;
};

export const buildSelectedCardsContext = (cards = []) => {
    if (!Array.isArray(cards) || cards.length === 0) {
        return '';
    }

    let remainingChars = MAX_TOTAL_CONTEXT_CHARS;
    const sections = cards
        .slice(0, MAX_SELECTED_CONTEXT_CARDS)
        .map((card) => {
        if (remainingChars <= 0) {
            return '';
        }

        const title = card?.data?.title || 'Untitled';
        const messages = Array.isArray(card?.data?.messages) ? card.data.messages : [];
        const messageLines = messages
            .map((message) => {
                const content = extractMessageContentText(message?.content);
                if (!content) return '';
                return `${message?.role || 'user'}: ${content}`;
            })
            .filter(Boolean);

        if (messageLines.length === 0) {
            return '';
        }

        const messageBody = truncateCardContextFromTail(messageLines.join('\n'));
        if (!messageBody) {
            return '';
        }

        const limitedMessageBody = messageBody.length <= remainingChars
            ? messageBody
            : `...${messageBody.slice(-remainingChars)}`;

        remainingChars -= limitedMessageBody.length;
        return `--- Card: "${title}" ---\n${limitedMessageBody}`;
    })
        .filter(Boolean);

    if (sections.length === 0) {
        return '';
    }

    return `${sections.join('\n\n')}\n\n---\n\nBased on the above context, please respond to:\n\n`;
};
