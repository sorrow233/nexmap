export const FALLBACK_GLOBAL_ROLES = Object.freeze({
    chat: { providerId: 'google', model: 'google/gemini-3-pro-preview' },
    image: { providerId: 'google', model: 'gemini-3-pro-image-preview' }
});

export function cloneGlobalRoles(roles) {
    return {
        chat: {
            ...FALLBACK_GLOBAL_ROLES.chat,
            ...(roles?.chat || {})
        },
        image: {
            ...FALLBACK_GLOBAL_ROLES.image,
            ...(roles?.image || {})
        }
    };
}

export function getSuggestedRoleModel(provider, role) {
    if (!provider) {
        return FALLBACK_GLOBAL_ROLES[role]?.model || '';
    }

    if (role === 'image') {
        return (
            provider.roles?.image
            || provider.model
            || FALLBACK_GLOBAL_ROLES.image.model
        );
    }

    return (
        provider.roles?.chat
        || provider.model
        || FALLBACK_GLOBAL_ROLES.chat.model
    );
}
