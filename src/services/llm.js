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

        // Create a focused prompt for follow-up questions
        const finalPrompt = `CONTEXT:
${contextText}



TASK: Based on the conversation history above, predict exactly 5 follow-up questions a user would naturally ask next.

Generate thoughtful, relevant questions that would help deepen understanding or explore related aspects of the topic discussed.

OUTPUT FORMAT:
Return ONLY a valid JSON array with exactly 5 question strings.
Example: ["How does this compare to X?", "What is the pricing?", ...]`;

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

/**
 * Generate quick sprout topics - optimized for accuracy
 * Uses topic decomposition strategy instead of user intent prediction
 * This is INDEPENDENT from generateFollowUpTopics (original Sprout)
 * Always returns exactly 3 topics
 */
export async function generateQuickSproutTopics(messages, config, model = null, options = {}) {
    try {
        // Take only the last 2 messages for focused context
        const contextMessages = messages.slice(-2);
        const contextText = contextMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');

        // Optimized prompt: decompose topics instead of guessing user intent
        // Key: respond in the same language as the user's input
        const finalPrompt = `CONTEXT:
${contextText}

TASK: Analyze the conversation above and identify exactly 3 distinct sub-topics or key concepts that are worth exploring in depth.

REQUIREMENTS:
- Each sub-topic should be specific, independent, and directly related to the main topic
- Focus on DECOMPOSING the knowledge structure, NOT guessing what the user might ask
- Each sub-topic should be actionable - something that can be explained or discussed further
- Keep each topic concise (under 15 words)
- IMPORTANT: Output topics in the SAME LANGUAGE as the context above. If context is in Chinese, output in Chinese. If in Japanese, output in Japanese.

OUTPUT FORMAT:
Return ONLY a valid JSON array with exactly 3 topic strings.
Example (English): ["React Hooks internals", "Virtual DOM diffing algorithm", "State management patterns"]
Example (Chinese): ["React Hooks 内部机制", "虚拟DOM差分算法", "状态管理模式"]`;

        const response = await chatCompletion(
            [{ role: 'user', content: finalPrompt }],
            config,
            model,
            options
        );

        if (!response || response.trim().length === 0) {
            console.warn('[QuickSprout] Empty response from AI, using fallback');
            return ["Core concepts", "Key details", "Practical applications"];
        }

        let cleanResponse = response.trim();

        // Remove markdown code blocks
        if (cleanResponse.startsWith('\`\`\`json')) {
            cleanResponse = cleanResponse.replace(/^\`\`\`json\s*/, '').replace(/\s*\`\`\`$/, '');
        } else if (cleanResponse.startsWith('\`\`\`')) {
            cleanResponse = cleanResponse.replace(/^\`\`\`\s*/, '').replace(/\s*\`\`\`$/, '');
        }

        // Extract JSON array
        const arrayMatch = cleanResponse.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            cleanResponse = arrayMatch[0];
        }

        const parsed = JSON.parse(cleanResponse);

        if (!Array.isArray(parsed) || parsed.length === 0) {
            console.warn('[QuickSprout] Invalid array, using fallback');
            return ["Core concepts", "Key details", "Practical applications"];
        }

        // Ensure exactly 3 topics
        return parsed.slice(0, 3);
    } catch (e) {
        console.error("[QuickSprout] Failed to generate topics:", e);
        return ["Core concepts", "Key details", "Practical applications"];
    }
}

/**
 * Generate a single continue topic - for in-card follow-up
 * Returns 1 question that continues the current conversation
 */
export async function generateContinueTopic(messages, config, model = null, options = {}) {
    try {
        const contextMessages = messages.slice(-4); // Last 4 messages for better context
        const contextText = contextMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');

        const finalPrompt = `CONTEXT:
${contextText}

TASK: Generate exactly 1 thought-provoking follow-up question that will help deepen the user's understanding of this topic.

REQUIREMENTS:
- The question should explore an UNEXPLORED aspect of the topic
- Focus on providing NEW PERSPECTIVE or deeper insight
- Make it specific, not generic
- IMPORTANT: Output in the SAME LANGUAGE as the context above

OUTPUT FORMAT:
Return ONLY the question text, no quotes or extra formatting.`;

        const response = await chatCompletion(
            [{ role: 'user', content: finalPrompt }],
            config,
            model,
            options
        );

        if (!response || response.trim().length === 0) {
            return "请详细解释一下这个概念的核心原理？";
        }

        return response.trim();
    } catch (e) {
        console.error("[ContinueTopic] Failed:", e);
        return "请详细解释一下这个概念的核心原理？";
    }
}

/**
 * Extract ALL main topics/sections from a conversation
 * Returns variable number of topics (not fixed to 3)
 * Used for the Branch feature - splits conversation into topic cards
 */
export async function extractConversationTopics(messages, config, model = null, options = {}) {
    try {
        // Use more context for topic extraction
        const contextText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

        const finalPrompt = `CONTEXT:
${contextText}

TASK: Analyze the conversation and extract ALL distinct main topics or sections that are discussed.

REQUIREMENTS:
- Identify EVERY major topic/subject that is introduced in the conversation
- Each topic should be a clear, standalone subject that can be discussed independently
- Include the key content/context for each topic so it can be understood alone
- IMPORTANT: Output topics in the SAME LANGUAGE as the context above

Example: If the conversation discusses 4 different games, extract all 4 game names as topics.
Example: If the conversation covers 3 different concepts, extract all 3 concepts.

OUTPUT FORMAT:
Return a valid JSON array with topic strings. The number of topics should match what's actually in the conversation.
Example: ["Detroit: Become Human 游戏介绍", "Beyond: Two Souls 游戏介绍", "Heavy Rain 游戏介绍", "Fahrenheit 游戏介绍"]`;

        const response = await chatCompletion(
            [{ role: 'user', content: finalPrompt }],
            config,
            model,
            options
        );

        if (!response || response.trim().length === 0) {
            console.warn('[ExtractTopics] Empty response');
            return ["主要话题"];
        }

        let cleanResponse = response.trim();

        // Remove markdown code blocks
        if (cleanResponse.startsWith('\`\`\`json')) {
            cleanResponse = cleanResponse.replace(/^\`\`\`json\s*/, '').replace(/\s*\`\`\`$/, '');
        } else if (cleanResponse.startsWith('\`\`\`')) {
            cleanResponse = cleanResponse.replace(/^\`\`\`\s*/, '').replace(/\s*\`\`\`$/, '');
        }

        // Extract JSON array
        const arrayMatch = cleanResponse.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            cleanResponse = arrayMatch[0];
        }

        const parsed = JSON.parse(cleanResponse);

        if (!Array.isArray(parsed) || parsed.length === 0) {
            console.warn('[ExtractTopics] Invalid array');
            return ["主要话题"];
        }

        return parsed;
    } catch (e) {
        console.error("[ExtractTopics] Failed:", e);
        return ["主要话题"];
    }
}
