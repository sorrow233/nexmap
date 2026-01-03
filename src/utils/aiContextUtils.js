import { getConnectedGraph } from './graphUtils';

/**
 * Assembles the context for a chat session, including connected cards.
 * @param {string} cardId - The ID of the current card.
 * @param {Array} connections - List of all connections.
 * @param {Array} cards - List of all cards.
 * @returns {Array} - An array of context messages.
 */
export const assembleContext = (cardId, connections, cards) => {
    // Context Walking
    const visited = getConnectedGraph(cardId, connections || []);
    const neighborIds = Array.from(visited).filter(id => id !== cardId);

    // Context Walking: Add neighbor context if any
    const contextMessages = [];
    if (neighborIds.length > 0) {
        const neighbors = cards.filter(c => neighborIds.indexOf(c.id) !== -1);
        const contextText = neighbors.map(c =>
            `Context from linked card "${c.data.title}": \n${c.data.messages.map(m => {
                const contentStr = typeof m.content === 'string'
                    ? m.content
                    : (Array.isArray(m.content)
                        ? m.content.map(p => p.type === 'text' ? p.text : '[Image]').join(' ')
                        : '');
                return `${m.role}: ${contentStr}`;
            }).join('\n')} `
        ).join('\n\n---\n\n');

        if (contextText.trim()) {
            contextMessages.push({ role: 'user', content: `[System Note: This card is connected to others. Here is their recent context:]\n\n${contextText}` });
        }
    }
    return contextMessages;
};
