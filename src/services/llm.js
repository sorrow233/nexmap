import { getProviderSettings, saveProviderSettings, getActiveConfig } from './llm/registry';
import { ModelFactory } from './llm/factory';

export { getProviderSettings, saveProviderSettings, getActiveConfig };

// Backwards compatibility alias
export const getApiConfig = getActiveConfig;

/**
 * Main chat completion function
 */
export async function chatCompletion(messages, model = null, options = {}) {
    let apiConfig;
    if (options.providerId) {
        const settings = getProviderSettings();
        apiConfig = settings.providers[options.providerId] || getActiveConfig();
    } else {
        apiConfig = options.overrideConfig || getActiveConfig();
    }

    const provider = ModelFactory.getProvider(apiConfig);
    return provider.chat(messages, model, options);
}

/**
 * Streaming chat completion
 */
export async function streamChatCompletion(messages, onToken, model = null, options = {}) {
    let apiConfig;
    if (options.providerId) {
        const settings = getProviderSettings();
        apiConfig = settings.providers[options.providerId] || getActiveConfig();
    } else {
        apiConfig = options.overrideConfig || getActiveConfig();
    }

    const provider = ModelFactory.getProvider(apiConfig);
    return provider.stream(messages, onToken, model, options);
}

/**
 * Generate title from text
 */
export async function generateTitle(text) {
    try {
        const userMessage = `Summarize the following text into a very short, catchy title (max 5 words). Do not use quotes.\n\nText: ${text.substring(0, 500)}`;
        const title = await chatCompletion([{ role: 'user', content: userMessage }]);
        return title.trim();
    } catch (e) {
        return "New Conversation";
    }
}

/**
 * Generate an image from a prompt
 */
export async function imageGeneration(prompt, model = null, options = {}) {
    const settings = getProviderSettings();
    const providerId = options.providerId || settings.activeId;
    const providerConfig = settings.providers[providerId];

    if (!providerConfig || !providerConfig.apiKey) {
        throw new Error(`Provider ${providerId} is not configured or missing API Key.`);
    }

    const provider = ModelFactory.getProvider(providerConfig);
    return provider.generateImage(prompt, model, options);
}

// Expose to window for compatibility
if (typeof window !== 'undefined') {
    window.LLM = {
        getProviderSettings,
        saveProviderSettings,
        getActiveConfig,
        getApiConfig,
        chatCompletion,
        streamChatCompletion,
        generateTitle,
        imageGeneration
    };
}
