export const createCardIndexMutation = () => ({
    version: 0,
    mode: 'bulk',
    updatedCards: [],
    reason: 'init'
});

const sanitizeUpdatedCards = (updatedCards) => (
    Array.isArray(updatedCards)
        ? updatedCards.filter(Boolean)
        : []
);

export const nextCardIndexMutation = (previousMutation, config = {}) => ({
    version: (previousMutation?.version || 0) + 1,
    mode: config.mode === 'patch' ? 'patch' : 'bulk',
    updatedCards: sanitizeUpdatedCards(config.updatedCards),
    reason: typeof config.reason === 'string' ? config.reason : 'unspecified'
});
