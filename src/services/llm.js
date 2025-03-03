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

/**
 * Generate follow-up questions based on conversation history
 */
export async function generateFollowUpTopics(messages, model = null, options = {}) {
    try {
        const systemPrompt = `Based on the conversation history, predict the top 5 questions the user is most likely to ask next.

Requirements:
- Questions should be short (5-10 words)
- Must be highly contextual and specific to this conversation
- Cover different angles: implementation, troubleshooting, principles, alternatives, extensions
- Return ONLY a JSON array of strings: ["Question 1?", "Question 2?", ...]
- No explanations, no markdown, just the array`;

        const taskMessages = [
            ...messages.slice(-10), // Last 10 messages for context
            { role: 'system', content: systemPrompt }
        ];

        const response = await chatCompletion(taskMessages, model, options);
        let cleanResponse = response.trim();

        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/^```json/, '').replace(/```$/, '');
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/^```/, '').replace(/```$/, '');
        }

        const parsed = JSON.parse(cleanResponse);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Failed to generate follow-up topics:", e);
        return ["Tell me more", "Show me examples", "What are the risks?", "Are there alternatives?", "How does it work?"];
    }
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
        imageGeneration,
        generateFollowUpTopics
    };
}
