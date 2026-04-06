export function normalizeModelIdForProvider(providerId, modelId) {
    const normalizedId = typeof modelId === 'string' ? modelId.trim() : '';
    if (!normalizedId) return '';

    if (providerId === 'google') {
        const lowered = normalizedId.toLowerCase();
        const clean = lowered.startsWith('google/')
            ? lowered.slice('google/'.length)
            : lowered;

        const isGoogleTextModel = (clean.startsWith('gemini-') || clean.startsWith('gemma-'))
            && !clean.includes('image');

        if (isGoogleTextModel) {
            return normalizedId.startsWith('google/')
                ? normalizedId
                : `google/${normalizedId}`;
        }
    }

    return normalizedId;
}

export function modelsMatch(modelA, modelB, providerId = null) {
    return normalizeModelIdForProvider(providerId, modelA) === normalizeModelIdForProvider(providerId, modelB);
}
