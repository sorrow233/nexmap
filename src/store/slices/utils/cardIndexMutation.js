export const createCardIndexMutation = () => ({
    version: 0,
    mode: 'bulk',
    scope: 'bulk',
    updatedIds: [],
    reason: 'init'
});

const sanitizeUpdatedIds = (config = {}) => {
    if (Array.isArray(config.updatedIds)) {
        return config.updatedIds.filter(Boolean);
    }

    if (Array.isArray(config.updatedCards)) {
        return config.updatedCards
            .map((card) => card?.id)
            .filter(Boolean);
    }

    return [];
};

export const nextCardIndexMutation = (previousMutation, config = {}) => ({
    version: (previousMutation?.version || 0) + 1,
    mode: config.mode === 'patch' ? 'patch' : 'bulk',
    scope: config.scope === 'content'
        ? 'content'
        : (config.mode === 'patch' ? 'geometry' : 'bulk'),
    updatedIds: sanitizeUpdatedIds(config),
    reason: typeof config.reason === 'string' ? config.reason : 'unspecified'
});
