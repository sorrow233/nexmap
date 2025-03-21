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

        const finalPrompt = `你是一个批判性、富有洞察力的思考伙伴（Muse）。分析对话历史，生成恰好 5 个多样化、高影响力的后续问题/方向。

对话历史：
${contextText}

指令：
1. **挑战性与洞察力**：不要问"有什么好处？"这类泛泛的问题。相反，质疑假设、提出反直觉的角度，或指出潜在矛盾。
2. **多角度思考**：
   - *怀疑论者*：质疑前提或可行性
   - *未来主义者*：投射到极端未来或更大规模
   - *跨界连接者*：将其与看似无关的领域（如生物学、历史、物理学）联系起来
   - *战略家*：关注二阶、三阶后果
   - *唱反调者*：论证相反观点
3. **自然直接**：以敏锐的知识伙伴身份写作，而非机器人。使用简洁、直接的措辞。
4. **有效 JSON**：你必须只返回一个 JSON 字符串数组。

优秀问题示例：
- "这种效率提升是否实际上让系统变得更脆弱？"
- "如果完全颠倒激励结构会怎样？"
- "在零信任环境中，这个机制如何运作？"

只返回一个包含恰好 5 个字符串的 JSON 数组：["问题 1？", "问题 2？", "问题 3？", "问题 4？", "问题 5？"]
不要有其他任何文本。`;

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
