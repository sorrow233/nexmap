export function normalizeModelIdForProvider(providerId, modelId) {
    const normalizedId = typeof modelId === 'string' ? modelId.trim() : '';
    if (!normalizedId) return '';

    if (providerId === 'google' && normalizedId.startsWith('google/')) {
        return normalizedId.slice('google/'.length);
    }

    return normalizedId;
}

export function modelsMatch(modelA, modelB, providerId = null) {
    return normalizeModelIdForProvider(providerId, modelA) === normalizeModelIdForProvider(providerId, modelB);
}
