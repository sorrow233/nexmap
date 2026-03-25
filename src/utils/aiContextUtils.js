import { getConnectedGraph } from './graphUtils';
import { extractMessageContentText } from './boardPerformance';

const MAX_LINKED_CONTEXT_CARDS = 6;
const MAX_CONTEXT_CHARS_PER_CARD = 12_000;
const MAX_CONTEXT_TOTAL_CHARS = 36_000;

const truncateTextFromTail = (text, limit) => {
    if (!text || text.length <= limit) {
        return text;
    }

    return `...${text.slice(-limit)}`;
};

/**
 * Assembles the context for a chat session, including connected cards.
 * @param {string} cardId - The ID of the current card.
 * @param {Array} connections - List of all connections.
 * @param {Function} getCardById - Card getter.
 * @returns {Array} - An array of context messages.
 */
export const assembleContext = (cardId, connections, getCardById) => {
    const visited = getConnectedGraph(cardId, connections || []);
    const neighborIds = Array.from(visited)
        .filter((id) => id !== cardId)
        .slice(0, MAX_LINKED_CONTEXT_CARDS);

    const contextMessages = [];
    if (neighborIds.length > 0) {
        let remainingChars = MAX_CONTEXT_TOTAL_CHARS;
        const sections = [];

        neighborIds.forEach((neighborId) => {
            if (remainingChars <= 0 || typeof getCardById !== 'function') {
                return;
            }

            const card = getCardById(neighborId);
            if (!card) return;

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
                return;
            }

            const cardBody = truncateTextFromTail(
                messageLines.join('\n'),
                Math.min(MAX_CONTEXT_CHARS_PER_CARD, remainingChars)
            );

            if (!cardBody) {
                return;
            }

            sections.push(`Context from linked card "${title}":\n${cardBody}`);
            remainingChars -= cardBody.length;
        });

        const contextText = sections.join('\n\n---\n\n');

        if (contextText.trim()) {
            contextMessages.push({ role: 'user', content: `[System Note: This card is connected to others. Here is their recent context:]\n\n${contextText}` });
        }
    }
    return contextMessages;
};
