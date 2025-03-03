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
        const systemPrompt = `You are analyzing a conversation. Based on the user's questions and our previous responses, predict the top 5 questions the user is MOST LIKELY to ask next.

CRITICAL RULES:
1. Questions MUST be directly related to what was just discussed
2. Questions should be natural follow-ups a human would ask
3. Be specific - use exact terms/concepts from the conversation
4. Each question should explore a different angle
5. Keep questions concise (5-12 words)

Return ONLY a JSON array: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]
NO explanations, NO markdown formatting, JUST the JSON array.`;

        const taskMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-10) // Last 10 messages for context
        ];

        const response = await chatCompletion(taskMessages, model, options);
        console.log('[Sprout Debug] Raw AI response:', response);

        if (!response || response.trim().length === 0) {
            console.warn('[Sprout] Empty response from AI, using fallback');
            return ["Tell me more", "Show me examples", "What are the risks?", "Are there alternatives?", "How does it work?"];
        }

        let cleanResponse = response.trim();

        // Remove markdown code blocks
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        // Further cleanup: remove any trailing text after the array
        const arrayMatch = cleanResponse.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            cleanResponse = arrayMatch[0];
        }

        console.log('[Sprout Debug] Cleaned response:', cleanResponse);

        const parsed = JSON.parse(cleanResponse);

        if (!Array.isArray(parsed) || parsed.length === 0) {
            console.warn('[Sprout] Invalid array, using fallback');
            return ["Tell me more", "Show me examples", "What are the risks?", "Are there alternatives?", "How does it work?"];
        }

        return parsed;
    } catch (e) {
        console.error("[Sprout] Failed to generate follow-up topics:", e);
        console.error("[Sprout] Error details:", e.message);
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
