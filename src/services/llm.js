import { ModelFactory } from './llm/factory';
import { DEFAULT_ROLES } from './llm/registry';
import { userStatsService } from './stats/userStatsService';


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
    if (model) userStatsService.incrementModelUsage(model);
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
    if (model) userStatsService.incrementModelUsage(model);
    return provider.stream(messages, onToken, model, options);
}

/**
 * Generate an image from a prompt
 * Uses 'image' role model
 * For users without API key, uses SystemCreditsProvider with weekly quota
 */
export async function imageGeneration(prompt, config, model = null, options = {}) {
    if (!config) {
        throw new Error(`Provider configuration is missing.`);
    }

    const provider = ModelFactory.getProvider(config);
    // Track image generation as "dall-e-3" (or general image model) usage
    userStatsService.incrementModelUsage('dall-e-3');
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

        // Fixed 3 topics for toolbar Sprout
        const finalPrompt = `对话内容：
${contextText}

分析上面的对话，提取 3 个值得深入探讨的子话题。

要求：
- 固定输出 3 个
- 每个话题要具体、独立
- 用对话中使用的语言输出

输出格式：
只输出 JSON 数组，例如：["话题1", "话题2", "话题3"]`;

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

        // Return exactly 3 topics
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
        const contextMessages = messages.slice(-4);
        const contextText = contextMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');

        const finalPrompt = `对话内容：
${contextText}

你是一个正在和朋友聊天的普通人。刚才朋友给你讲了上面这些内容。

现在，你对其中某个细节特别好奇，想追问一句。

要求：
- 用最自然的口语问一个问题（就像你真的在微信上打字）
- 问题要简短，不超过20个字
- 不要用"请问"、"能否"这种书面语
- 直接问最想知道的那个点

只输出问题本身，不要任何其他内容。`;

        const response = await chatCompletion(
            [{ role: 'user', content: finalPrompt }],
            config,
            model,
            options
        );

        if (!response || response.trim().length === 0) {
            return "这个具体是怎么实现的？";
        }

        return response.trim();
    } catch (e) {
        console.error("[ContinueTopic] Failed:", e);
        return "这个具体是怎么实现的？";
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
- CRITICAL: Return a MAXIMUM of 4 topics. If there are more, select the 4 most important ones.

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
        // Limit to max 4 topics
        return parsed.slice(0, 4);
    } catch (e) {
        console.error("[ExtractTopics] Failed:", e);
        return ["主要话题"];
    }
}
/**
 * Split text into logical sections using AI understanding
 * Returns EXACT substrings from the original text (no paraphrasing)
 * Max 4 sections
 */
export async function splitTextIntoSections(text, config, model = null, options = {}) {
    try {
        if (!text || text.length < 50) return [text];

        const finalPrompt = `TEXT TO SPLIT:
${text}

TASK: Split the text above into logical sections (e.g., based on numbered lists, distinct topics, or paragraphs).

CRITICAL REQUIREMENTS:
1. Return a JSON array of strings.
2. Each string MUST be an EXACT COPY of a part of the original text.
3. DO NOT rewrite, summarize, or paraphrase anything.
4. The concatenation of the parts should roughly reconstruct the main ideas of the original text, but you can omit transitional fluff.
5. Max 4 sections. If there are more, combine them or pick the most important 4.
6. Each section should be substantial enough to be a standalone card content.

Example Output:
["First part of text...", "Second part of text..."]`;

        // console.log('[SplitText] Sending prompt length:', finalPrompt.length);

        const response = await chatCompletion(
            [{ role: 'user', content: finalPrompt }],
            config,
            model,
            options
        );

        if (!response || response.trim().length === 0) {
            console.warn('[SplitText] Empty response');
            return [text];
        }

        let cleanResponse = response.trim();

        // Remove markdown code blocks
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleanResponse);

        if (!Array.isArray(parsed) || parsed.length === 0) {
            console.warn('[SplitText] Invalid array');
            return [text];
        }

        // Validate that chunks are actually in the text (fuzzy check or just trust for now, 
        // enforcing exact match in prompt is usually enough for decent models)
        // If the model summarizes, it's a failure of the model instruction following, 
        // but typically "EXACT COPY" works well with modern models.

        return parsed.slice(0, 4);

    } catch (e) {
        console.error("[SplitText] Failed:", e);
        // Fallback: split by double newline
        return text.split(/\n\s*\n/).filter(s => s.trim().length > 20).slice(0, 4);
    }
}

/**
 * Generate cards based on user direction/instruction
 * Returns array of card contents
 */
export async function generateDirectedCards(messages, instruction, config, model = null, options = {}) {
    try {
        const contextText = messages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${typeof m.content === 'string' ? m.content : ''}`).join('\n\n');

        const finalPrompt = `CONTEXT:
${contextText}

USER INSTRUCTION:
"${instruction}"

TASK:
Based on the context above and the user's instruction, generate a list of new card contents.
The user wants to branch out or explore specific aspects as described in the instruction.

REQUIREMENTS:
1. Return a JSON array of strings.
2. Each string will be the content of a new card.
3. The content can be a summary, an expanded explanation, a question, or whatever the user asked for.
4. Max 4 cards.

Example Output:
["Content for card 1", "Content for card 2"]`;

        const response = await chatCompletion(
            [{ role: 'user', content: finalPrompt }],
            config,
            model,
            options
        );

        if (!response || response.trim().length === 0) {
            return [];
        }

        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const arrayMatch = cleanResponse.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            cleanResponse = arrayMatch[0];
        }

        const parsed = JSON.parse(cleanResponse);
        if (!Array.isArray(parsed)) return [];
        return parsed.slice(0, 4);

    } catch (e) {
        console.error("[DirectedCards] Failed:", e);
        return [];
    }
}
