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
 * Generate follow-up topics based on conversation history
 */
export async function generateFollowUpTopics(messages, model = null, options = {}) {
    try {
        // Filter out system messages if they might confuse the specific topic generation
        // But context is important, so we keep them but append our instruction

        // We need to provide a very strict system prompt
        const systemPrompt = `You are a creative conversation partner.
Based on the conversation history provided, suggest 5 distinct, intriguing follow-up topics or sub-questions that the user might want to explore next.
The topics should be short (3-8 words), relevant, and diverse.
Return STRICTLY a JSON array of strings, e.g., ["Topic A", "Topic B", ...].
Do not include any explanation, markdown formatting, or code blocks. Just the raw JSON array.`;

        // Create a new message list for this specific task
        const taskMessages = [
            ...messages,
            { role: 'system', content: systemPrompt }
        ];

        // If the model supports JSON mode natively, we could use it, but for now we prompt engineering
        // Use a high-intelligence model if possible, or the current model
        const response = await chatCompletion(taskMessages, model, options);

        // Clean up response just in case
        let cleanResponse = response.trim();
        // Remove markdown code blocks if present
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/^```json/, '').replace(/```$/, '');
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/^```/, '').replace(/```$/, '');
        }

        return JSON.parse(cleanResponse);
    } catch (e) {
        console.error("Failed to generate follow-up topics:", e);
        // Fallback topics if parsing fails
        return ["Tell me more", "Explain the details", "What are the examples?", "Related concepts", "Why is this important?"];
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
