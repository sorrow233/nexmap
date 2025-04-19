export const DEFAULT_PROVIDERS = {
    'google': {
        id: 'google',
        name: 'GMI Gemini',
        baseUrl: 'https://api.gmi-serving.com/v1',
        apiKey: '',
        model: 'google/gemini-3-pro-preview',
        protocol: 'gemini'
    }
};

export const DEFAULT_ROLES = {
    chat: 'google/gemini-3-pro-preview',
    analysis: 'google/gemini-3-flash-preview',
    image: 'gemini-3-pro-image-preview'
};
