export const DEFAULT_PROVIDERS = {
    'google': {
        id: 'google',
        name: 'Vertex',
        baseUrl: 'https://aiplatform.googleapis.com/v1/publishers/google',
        apiKey: '',
        authMode: 'api-key',
        model: 'gemini-2.5-flash',
        protocol: 'gemini',
        roles: {
            chat: 'gemini-2.5-flash',
            analysis: 'gemini-2.5-flash',
            image: 'gemini-3-pro-image-preview'
        }
    }
};

export const DEFAULT_ROLES = {
    chat: 'gemini-2.5-flash',
    analysis: 'gemini-2.5-flash',
    image: 'gemini-3-pro-image-preview'
};
