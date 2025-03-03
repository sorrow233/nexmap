import { getProviderSettings, saveProviderSettings, getActiveConfig, DEFAULT_ROLES, DEFAULT_PROVIDERS } from './llm/registry';
import { ModelFactory } from './llm/factory';

export { getProviderSettings, saveProviderSettings, getActiveConfig, DEFAULT_ROLES };

// Backwards compatibility alias
export const getApiConfig = getActiveConfig;

/**
 * Helper to get config by role
 */
function getConfigByRole(role = 'chat') {
    const settings = getProviderSettings();
    const roleId = (settings.roles && settings.roles[role]) ? settings.roles[role] : settings.activeId;
    return settings.providers[roleId] || DEFAULT_PROVIDERS['google'];
}

/**
 * Main chat completion function
 */
export async function chatCompletion(messages, model = null, options = {}) {
    let apiConfig;

    // 1. Explicit provider ID overrides everything
    if (options.providerId) {
        const settings = getProviderSettings();
        apiConfig = settings.providers[options.providerId];
    }
    // 2. Explicit config object overrides everything else
    else if (options.overrideConfig) {
        apiConfig = options.overrideConfig;
    }
    // 3. Fallback to Role-based config
    else {
        const role = options.role || 'chat';
        apiConfig = getConfigByRole(role);
    }

    // Safety check
    if (!apiConfig) apiConfig = getActiveConfig();

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
        apiConfig = settings.providers[options.providerId];
    } else if (options.overrideConfig) {
        apiConfig = options.overrideConfig;
    } else {
        const role = options.role || 'chat';
        apiConfig = getConfigByRole(role);
    }

    // Safety check
    if (!apiConfig) apiConfig = getActiveConfig();

    const provider = ModelFactory.getProvider(apiConfig);
    return provider.stream(messages, onToken, model, options);
}

/**
 * Generate title from text
 */
export async function generateTitle(text) {
    try {
        const userMessage = `Summarize the following text into a very short, catchy title (max 5 words). Do not use quotes.\n\nText: ${text.substring(0, 500)}`;

        // Use 'extraction' role for titles
        const title = await chatCompletion(
            [{ role: 'user', content: userMessage }],
            null,
            { role: 'extraction' }
        );
        return title.trim();
    } catch (e) {
        return "New Conversation";
    }
}

/**
 * Generate an image from a prompt
 */
export async function imageGeneration(prompt, model = null, options = {}) {
    let apiConfig;

    if (options.providerId) {
        const settings = getProviderSettings();
        apiConfig = settings.providers[options.providerId];
    } else {
        // Use 'image' role by default
        apiConfig = getConfigByRole('image');
    }

    if (!apiConfig || !apiConfig.apiKey) {
        throw new Error(`Image Provider is not configured or missing API Key.`);
    }

    const provider = ModelFactory.getProvider(apiConfig);
    return provider.generateImage(prompt, model, options);
}

/**
 * Generate follow-up questions based on conversation history
 */
export async function generateFollowUpTopics(messages, model = null, options = {}) {
    try {
        // Construct a single user message for maximum compatibility
        // Some models/proxies ignore system messages or handle them poorly
        const contextText = messages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n\n');

        const finalPrompt = `Analyze the following conversation history and predict the top 5 questions the user is MOST LIKELY to ask next.

CONVERSATION HISTORY:
${contextText}

INSTRUCTIONS:
1. Questions MUST be directly related to what was just discussed
2. Questions should be natural follow-ups a human would ask
3. Be specific - use exact terms/concepts from the conversation
4. Each question should explore a different angle
5. Keep questions concise (5-12 words)

Return ONLY a JSON array: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]
NO explanations, NO markdown formatting, JUST the JSON array.`;

        console.log('[Sprout Debug] Sending prompt length:', finalPrompt.length);

        // Use 'analysis' role for follow-up generation
        const response = await chatCompletion(
            [{ role: 'user', content: finalPrompt }],
            model,
            { ...options, role: 'analysis' }
        );
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
