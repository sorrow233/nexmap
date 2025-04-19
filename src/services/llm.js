import { ModelFactory } from './llm/factory';
import { DEFAULT_ROLES } from './llm/registry';

export { DEFAULT_ROLES };

/**
 * Main chat completion function
 * Requires config to be passed explicitly (Inversion of Control)
 */
export async function chatCompletion(messages, config, model = null, options = {}) {
    if (!config) {
        throw new Error("ChatCompletion: Config must be provided");
    }
    const provider = ModelFactory.getProvider(config);
    return provider.chat(messages, model, options);
}

/**
 * Streaming chat completion - used for main conversations
 * Defaults to 'chat' role model
 */
export async function streamChatCompletion(messages, config, onToken, model = null, options = {}) {
    if (!config) {
        throw new Error("StreamChatCompletion: Config must be provided");
    }

    // Use role-based model selection if no explicit model provided
    // Note: Roles should be handled by the caller or passed within config if needed, 
    // but for now we'll assume the caller passes the specific model or we resolve it here if possible.
    // Ideally, 'model' argument should be the final resolved model.

    // For backwards compatibility/convenience, if model is null, we might need to know the 'chat' role model.
    // But logically, the 'config' object might not contain roles if it's just the provider config.
    // Let's assume the caller resolves the model using `getRoleModel` helper from the store BEFORE calling this.
    // However, to keep it simple for now, we'll rely on the passed model.

    const provider = ModelFactory.getProvider(config);
    return provider.stream(messages, onToken, model, options);
}

/**
 * Generate an image from a prompt
 * Uses 'image' role model
 */
export async function imageGeneration(prompt, config, model = null, options = {}) {
    if (!config || !config.apiKey) {
        throw new Error(`Provider is not configured or missing API Key.`);
    }

    const provider = ModelFactory.getProvider(config);
    return provider.generateImage(prompt, model, options);
}

/**
 * Generate follow-up questions based on conversation history
 * Uses 'analysis' role model for better reasoning
 */
export async function generateFollowUpTopics(messages, config, model = null, options = {}) {
    try {
        // OPTIMIZATION: Only send the last interaction (User + Assistant) pair + system context if needed.
        // But for follow-up questions, we really only need the immediate context of what was just discussed.
        // Sending 10 messages is overkill and slow.

        // Take the last 2 messages (usually [user, assistant])
        const contextMessages = messages.slice(-2);

        const contextText = contextMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');

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

        // console.log('[Sprout Debug] Sending prompt length:', finalPrompt.length);

        const response = await chatCompletion(
            [{ role: 'user', content: finalPrompt }],
            config,
            model,
            options
        );
        // console.log('[Sprout Debug] Raw AI response:', response);

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

        // console.log('[Sprout Debug] Cleaned response:', cleanResponse);

        const parsed = JSON.parse(cleanResponse);

        if (!Array.isArray(parsed) || parsed.length === 0) {
            console.warn('[Sprout] Invalid array, using fallback');
            return ["Tell me more", "Show me examples", "What are the risks?", "Are there alternatives?", "How does it work?"];
        }

        return parsed;
    } catch (e) {
        console.error("[Sprout] Failed to generate follow-up topics:", e);
        return ["Tell me more", "Show me examples", "What are the risks?", "Are there alternatives?", "How does it work?"];
    }
}

