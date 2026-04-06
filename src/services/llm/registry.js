export const DEFAULT_PROVIDERS = {
    'google': {
        id: 'google',
        name: 'GMI Gemini Proxy',
        baseUrl: 'https://api.gmi-serving.com/v1',
        apiKey: '',
        model: 'google/gemini-3.1-pro-preview',
        protocol: 'gemini',
        roles: {
            chat: 'google/gemini-3.1-pro-preview',
            analysis: 'google/gemini-3.1-pro-preview',
            image: 'gemini-3-pro-image-preview'
        }
    }
};

export const DEFAULT_ROLES = {
    chat: 'google/gemini-3.1-pro-preview',
    analysis: 'google/gemini-3.1-pro-preview',
    image: 'gemini-3-pro-image-preview'
};
