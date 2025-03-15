import { getProviderSettings, saveProviderSettings, getActiveConfig, getRoleModel, DEFAULT_PROVIDERS, DEFAULT_ROLES } from './llm/registry';
import { ModelFactory } from './llm/factory';

export { getProviderSettings, saveProviderSettings, getActiveConfig, getRoleModel, DEFAULT_ROLES };

// Backwards compatibility alias
export const getApiConfig = getActiveConfig;

/**
 * Main chat completion function
 */
export async function chatCompletion(messages, model = null, options = {}) {
    const apiConfig = options.overrideConfig || getActiveConfig();
    const provider = ModelFactory.getProvider(apiConfig);
    return provider.chat(messages, model, options);
}

/**
 * Streaming chat completion - used for main conversations
 * Defaults to 'chat' role model
 */
export async function streamChatCompletion(messages, onToken, model = null, options = {}) {
    let apiConfig;

    if (options.providerId) {
        const settings = getProviderSettings();
        apiConfig = settings.providers[options.providerId];
    } else if (options.overrideConfig) {
        apiConfig = options.overrideConfig;
    } else {
        apiConfig = getActiveConfig();
    }

    // Use role-based model selection if no explicit model provided
    const finalModel = model || getRoleModel('chat');

    const provider = ModelFactory.getProvider(apiConfig);
    return provider.stream(messages, onToken, finalModel, options);
}

/**
 * Generate an image from a prompt
 * Uses 'image' role model
 */
export async function imageGeneration(prompt, model = null, options = {}) {
    const apiConfig = options.providerId
        ? getProviderSettings().providers[options.providerId]
        : getActiveConfig();

    if (!apiConfig || !apiConfig.apiKey) {
        throw new Error(`Provider is not configured or missing API Key.`);
    }

    // Use role-based model for image generation
    const finalModel = model || getRoleModel('image');

    const provider = ModelFactory.getProvider(apiConfig);
    return provider.generateImage(prompt, finalModel, options);
}

/**
 * Generate follow-up questions based on conversation history
 * Uses 'analysis' role model for better reasoning
 */
export async function generateFollowUpTopics(messages, model = null, options = {}) {
    try {
        const contextText = messages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n\n');

        const finalPrompt = `You are a curious, intelligent thinking partner. Analyze the conversation history and generate 3-4 thoughtful, diverse follow-up questions/directions.

CONVERSATION HISTORY:
${contextText}

INSTRUCTIONS:
1. Questions should sound like a human curious to explore the topic deeper, NOT a generic AI assistant.
2. Be direct and conversational. Avoid "Can you tell me more about..." or "What are the..." patterns.
3. Instead of simple information requests, propose angles that challenge assumptions or connect ideas.
4. Keep questions concise (under 15 words).
5. Ensure diversity: ask for examples, potential risks, counter-arguments, or creative extensions.

Return ONLY a JSON array of strings: ["Question 1?", "Question 2?", "Question 3?"]
NO other text.`;

        console.log('[Sprout Debug] Sending prompt length:', finalPrompt.length);

        // Use 'analysis' role for better reasoning on follow-up questions
        const finalModel = model || getRoleModel('analysis');

        const response = await chatCompletion(
            [{ role: 'user', content: finalPrompt }],
            finalModel,
            options
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
        getRoleModel,
        chatCompletion,
        streamChatCompletion,
        imageGeneration,
        generateFollowUpTopics
    };
}
