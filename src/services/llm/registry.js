export const DEFAULT_PROVIDERS = {
    'google': {
        id: 'google',
        name: 'GMI Gemini',
        baseUrl: 'https://api.gmi-serving.com/v1',
        apiKey: '',
        model: 'google/gemini-2.0-flash-exp',
        protocol: 'gemini',
        roles: {
            chat: 'google/gemini-2.0-flash-exp',
            analysis: 'google/gemini-2.0-flash-exp',
            image: 'gemini-3-pro-image-preview'
        }
    }
};

export const DEFAULT_ROLES = {
    chat: 'google/gemini-2.0-flash-exp',
    analysis: 'google/gemini-2.0-flash-exp',
    image: 'gemini-3-pro-image-preview'
};
