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

        const finalPrompt = `Based on the conversation history below, predict exactly 5 questions that a real user would naturally ask next as they explore this topic further.

CONVERSATION HISTORY:
${contextText}

INSTRUCTIONS:
1. **Language**: Generate questions in the SAME LANGUAGE as the conversation above (Chinese/English/etc).
2. **Think like a curious user**: What would YOU personally want to know next if you were having this conversation?
3. **Natural progression**: Questions should feel like the natural next step in the conversation, not random tangents.
4. **Variety**: Mix different types of natural questions:
   - Asking for clarification on something just mentioned
   - Requesting practical examples or how-to advice
   - Digging deeper into an interesting point
   - Asking "what if" or hypothetical scenarios
   - Seeking personal experience or opinions
5. **Conversational tone**: Sound like a real person chatting, not an academic interviewer.

Return ONLY a valid JSON array with exactly 5 question strings.
Example format: ["具体怎么做？", "有没有例子？", "如果...会怎样？", "你觉得呢？", "还有其他方法吗？"]`;

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
