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
    const provider = ModelFactory.getProvider(config, { model });
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

    const provider = ModelFactory.getProvider(config, { model });
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

    const provider = ModelFactory.getProvider(config, { model });
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

/**
 * Agent Mode: plan multiple cards from one user request.
 * Returns a normalized plan object:
 * {
 *   planTitle,
 *   strategy,
 *   cards: [{ title, objective, prompt, deliverable, executionType, completionBoundary, quickStart }]
 * }
 */
export async function generateAgentCardPlan(request, context = '', config, model = null, options = {}, images = []) {
    const fallbackPrompt = (request || '').trim() || 'Please break down the user request into actionable cards.';
    const MAX_AGENT_CARDS = 20;
    const EXECUTION_TYPES = {
        AI_EXECUTE: 'ai_execute',
        AI_GUIDE: 'ai_guide',
        USER_DO: 'user_do'
    };

    const trimForCard = (text, max = 48) => {
        const clean = String(text || '').trim().replace(/\s+/g, ' ');
        if (clean.length <= max) return clean;
        return `${clean.slice(0, max - 3)}...`;
    };

    const isLikelyChinese = /[\u4e00-\u9fff]/.test(fallbackPrompt);

    const normalizeExecutionType = (value) => {
        const raw = String(value || '').trim().toLowerCase();
        if (!raw) return EXECUTION_TYPES.AI_EXECUTE;
        if (raw.includes('ai_execute') || raw.includes('execute') || raw.includes('auto') || raw.includes('direct')) {
            return EXECUTION_TYPES.AI_EXECUTE;
        }
        if (raw.includes('ai_guide') || raw.includes('guide') || raw.includes('advice') || raw.includes('assist')) {
            return EXECUTION_TYPES.AI_GUIDE;
        }
        if (raw.includes('user_do') || raw.includes('human') || raw.includes('manual') || raw.includes('person')) {
            return EXECUTION_TYPES.USER_DO;
        }
        if (raw.includes('不能') || raw.includes('无法') || raw.includes('blocked') || raw.includes('external')) {
            return EXECUTION_TYPES.AI_GUIDE;
        }
        if (raw.includes('亲自') || raw.includes('本人') || raw.includes('线下') || raw.includes('must')) {
            return EXECUTION_TYPES.USER_DO;
        }
        return EXECUTION_TYPES.AI_EXECUTE;
    };

    const isThreeWayTriageRequest = (text) => {
        const source = String(text || '');
        const lower = source.toLowerCase();

        const forceGeneralMode = /(不要三分类|不要分类|保持通用|普通模式|normal mode|general mode|no triage|disable triage)/i.test(source);
        if (forceGeneralMode) return false;

        const explicitModeKeyword = /(\[triage\]|\[3way\]|三分类模式|三类模式|三路由|3-way|three-way|triage mode|执行分类模式|ai可执行.*ai不可执行.*亲自执行)/i.test(source);

        const buckets = [
            /(ai.{0,10}(可执行|能完成|可以完成|可处理|能处理)|能完成|可完成)/i,
            /(ai.{0,10}(不可执行|不能完成|无法完成|不能处理|can't|cannot)|无法完成|做不了)/i,
            /((必须|需要|得).{0,12}(我|用户|本人).{0,10}(做|执行|亲自)|must.{0,20}(user|me).{0,12}(do|execute)|in person|亲自执行|本人执行)/i
        ];
        const matchedBuckets = buckets.filter(re => re.test(source)).length;

        const hasSplitIntent = /(提取出来|拆分|分类|分组|split|classify|triage)/i.test(lower);

        if (explicitModeKeyword && matchedBuckets >= 2) return true;
        if (!explicitModeKeyword && hasSplitIntent && matchedBuckets === 3) return true;

        return false;
    };

    const triageMode = isThreeWayTriageRequest(fallbackPrompt);

    const classifyChecklistItem = (text) => {
        const content = String(text || '').trim();
        if (!content) return EXECUTION_TYPES.AI_GUIDE;

        const mustUserPattern = /(打电话|联系|线下|到店|面谈|面试|签字|盖章|递交|提交材料|付款|支付|转账|购买|采购|邮寄|快递|办理|预约|出席|现场|亲自|本人|call|meet|sign|pay|purchase|visit|appointment|in person|interview)/i;
        if (mustUserPattern.test(content)) return EXECUTION_TYPES.USER_DO;

        const aiNativePattern = /(总结|整理|提取|分析|生成|撰写|改写|翻译|归纳|规划|拆解|写|草拟|对比|计算|建模|代码|脚本|文案|summary|analy|extract|generate|write|draft|translate|plan|breakdown|code)/i;
        if (aiNativePattern.test(content)) return EXECUTION_TYPES.AI_EXECUTE;

        return EXECUTION_TYPES.AI_GUIDE;
    };

    const getDefaultBoundaryByType = (type) => {
        if (type === EXECUTION_TYPES.USER_DO) {
            return isLikelyChinese
                ? 'AI 不会假装替你完成线下/需要身份权限的动作，只提供可执行步骤。'
                : 'AI must not pretend to complete in-person or permission-gated actions; it only provides executable steps.';
        }
        if (type === EXECUTION_TYPES.AI_GUIDE) {
            return isLikelyChinese
                ? 'AI 提供最快路径、模板与决策建议，不宣称已完成外部动作。'
                : 'AI provides the fastest path, templates, and decisions, without claiming external actions are completed.';
        }
        return isLikelyChinese
            ? 'AI 直接完成可文本化/可计算化任务，必要时标注仍需外部动作的收尾项。'
            : 'AI directly completes text/analysis/code/planning tasks and flags any remaining external follow-ups.';
    };

    const getDefaultDeliverableByType = (type, index) => {
        if (type === EXECUTION_TYPES.USER_DO) {
            return isLikelyChinese
                ? `用户亲自执行清单（第 ${index + 1} 项）：步骤、材料、时间与风险提示。`
                : `User-executed checklist (item ${index + 1}): steps, required materials, timing, and risks.`;
        }
        if (type === EXECUTION_TYPES.AI_GUIDE) {
            return isLikelyChinese
                ? `AI 无法直接代办项（第 ${index + 1} 项）的快速完成路径与模板。`
                : `Fast path and templates for task ${index + 1} that AI cannot execute directly.`;
        }
        return isLikelyChinese
            ? `AI 可直接完成的任务结果（第 ${index + 1} 项）与可用输出。`
            : `Direct AI-completed output for task ${index + 1}, ready to use.`;
    };

    const getDefaultQuickStartByType = (type, subject = '') => {
        const safeSubject = String(subject || '').trim();
        if (type === EXECUTION_TYPES.USER_DO) {
            return isLikelyChinese
                ? `先确认你要亲自执行的动作与截止时间，再按步骤完成：${safeSubject || '目标任务'}.`
                : `Confirm the personal action and deadline first, then execute step-by-step for: ${safeSubject || 'the target task'}.`;
        }
        if (type === EXECUTION_TYPES.AI_GUIDE) {
            return isLikelyChinese
                ? `先给出最快路径（3 步内）与可复制模板，目标：${safeSubject || '任务推进'}.`
                : `Start with a 3-step fastest path and reusable template for: ${safeSubject || 'task progress'}.`;
        }
        return isLikelyChinese
            ? `立即产出可用结果，目标：${safeSubject || '任务完成'}.`
            : `Produce usable output immediately for: ${safeSubject || 'task completion'}.`;
    };

    const withExecutionMeta = (baseCard, executionType, index, subject = '', force = false, overrides = {}) => {
        if (!triageMode && !force) return baseCard;

        const normalizedType = normalizeExecutionType(executionType);
        const completionBoundary = String(overrides.completionBoundary || '').trim()
            || getDefaultBoundaryByType(normalizedType);
        const quickStart = String(overrides.quickStart || '').trim()
            || getDefaultQuickStartByType(normalizedType, subject);
        const deliverable = String(baseCard.deliverable || '').trim()
            || getDefaultDeliverableByType(normalizedType, index);

        return {
            ...baseCard,
            executionType: normalizedType,
            completionBoundary,
            quickStart,
            deliverable
        };
    };

    const ensureThreeWayCoverage = (cards) => {
        if (!triageMode) return cards;

        const normalized = Array.isArray(cards)
            ? cards.filter(Boolean).slice(0, MAX_AGENT_CARDS)
            : [];
        const existingTypes = new Set(normalized.map(card => normalizeExecutionType(card.executionType)));

        const synthesisTemplates = [
            {
                type: EXECUTION_TYPES.AI_EXECUTE,
                card: {
                    title: isLikelyChinese ? 'AI可直接完成项' : 'AI-Executable Tasks',
                    objective: isLikelyChinese ? '提取并完成可由 AI 直接完成的任务。' : 'Extract and complete tasks AI can do directly.',
                    prompt: isLikelyChinese ? '从用户请求中提取 AI 能直接完成的事项，并立即给出完成结果。' : 'Extract tasks AI can complete now and provide completed outputs immediately.'
                }
            },
            {
                type: EXECUTION_TYPES.AI_GUIDE,
                card: {
                    title: isLikelyChinese ? 'AI不可直接执行项' : 'AI-Guided Tasks',
                    objective: isLikelyChinese ? '识别 AI 无法直接执行但可加速推进的事项。' : 'Identify tasks AI cannot execute directly but can accelerate.',
                    prompt: isLikelyChinese ? '对 AI 无法直接执行的事项给出最快完成路径、模板和避坑点。' : 'For tasks AI cannot execute directly, provide fastest path, templates, and pitfalls.'
                }
            },
            {
                type: EXECUTION_TYPES.USER_DO,
                card: {
                    title: isLikelyChinese ? '必须你亲自执行项' : 'User-Must-Do Tasks',
                    objective: isLikelyChinese ? '识别必须由用户本人执行的事项并给出清单。' : 'Identify tasks that must be executed by the user personally.',
                    prompt: isLikelyChinese ? '列出必须你亲自做的事项，给出逐步操作、准备材料与截止建议。' : 'List tasks that must be done personally and provide step-by-step actions with required prep.'
                }
            }
        ];

        const appended = [...normalized];
        synthesisTemplates.forEach((entry) => {
            if (existingTypes.has(entry.type)) return;
            if (appended.length >= MAX_AGENT_CARDS) return;
            appended.push({
                ...entry.card,
                executionType: entry.type,
                completionBoundary: getDefaultBoundaryByType(entry.type),
                quickStart: getDefaultQuickStartByType(entry.type, entry.card.objective),
                deliverable: getDefaultDeliverableByType(entry.type, appended.length)
            });
        });

        return appended.slice(0, MAX_AGENT_CARDS);
    };

    const extractChecklistItems = (text) => {
        const source = String(text || '');
        const rawLines = source
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        const bulletRegex = /^([-*+•]|\d+[\.\)]|\[[ xX]\])\s+/;
        const bulletLines = rawLines
            .filter(line => bulletRegex.test(line))
            .map(line => line.replace(bulletRegex, '').trim())
            .filter(Boolean);

        let items = bulletLines;
        if (items.length < 2) {
            const delimiterSplit = source
                .split(/[;\n；]/)
                .map(item => item.trim())
                .map(item => item.replace(bulletRegex, '').trim())
                .filter(item => item.length >= 2 && item.length <= 120);
            if (delimiterSplit.length >= 2) {
                items = delimiterSplit;
            }
        }

        const unique = [];
        const seen = new Set();
        items.forEach(item => {
            const key = item.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(item);
            }
        });

        return unique.slice(0, MAX_AGENT_CARDS);
    };

    const checklistItems = extractChecklistItems(fallbackPrompt);

    const extractHardConstraints = (text) => {
        const source = String(text || '');
        const keywordPattern = /(必须|务必|不要|不能|不得|仅|只|至少|至多|上限|下限|exactly|must|only|do not|don't|without|at least|at most|max(?:imum)?|minimum|json|markdown|format|language|中文|英文|禁止)/i;
        const chunks = source
            .split(/\r?\n|[;；。.!?]/)
            .map(item => item.trim())
            .filter(item => item.length >= 2 && item.length <= 180)
            .filter(item => keywordPattern.test(item));

        const unique = [];
        const seen = new Set();
        chunks.forEach(item => {
            const key = item.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(item);
            }
        });
        return unique.slice(0, 8);
    };

    const hardConstraints = extractHardConstraints(fallbackPrompt);

    const buildFallbackPlan = () => {
        if (checklistItems.length >= 2) {
            const fallbackCards = checklistItems.slice(0, MAX_AGENT_CARDS).map((item, index) => {
                const executionType = triageMode ? classifyChecklistItem(item) : EXECUTION_TYPES.AI_EXECUTE;
                const baseCard = {
                    title: trimForCard(item, 32),
                    objective: item,
                    prompt: item,
                    deliverable: triageMode
                        ? getDefaultDeliverableByType(executionType, index)
                        : `Complete item ${index + 1} with a practical result.`
                };
                return withExecutionMeta(baseCard, executionType, index, item);
            });

            return {
                planTitle: 'AI Agent Plan',
                strategy: triageMode
                    ? 'Classify tasks into AI-executable, AI-guided, and user-must-do cards.'
                    : 'Use one focused card per checklist item.',
                cards: triageMode ? ensureThreeWayCoverage(fallbackCards) : fallbackCards
            };
        }

        const coreType = triageMode ? EXECUTION_TYPES.AI_GUIDE : EXECUTION_TYPES.AI_EXECUTE;
        return {
            planTitle: 'AI Agent Plan',
            strategy: triageMode
                ? 'Classify the goal into AI-executable, AI-guided, and user-must-do actions.'
                : 'Break down the goal into focused, executable cards.',
            cards: [withExecutionMeta({
                title: 'Core Task',
                objective: 'Address the main user request.',
                prompt: fallbackPrompt,
                deliverable: triageMode
                    ? getDefaultDeliverableByType(coreType, 0)
                    : 'Actionable output with clear next steps.'
            }, coreType, 0, fallbackPrompt)]
        };
    };

    const fallbackPlan = buildFallbackPlan();

    const normalizePlan = (raw) => {
        if (!raw || typeof raw !== 'object') return fallbackPlan;

        const rawCards = Array.isArray(raw.cards)
            ? raw.cards
            : Array.isArray(raw.plan)
                ? raw.plan
                : Array.isArray(raw)
                    ? raw
                    : [];

        const normalizedCards = rawCards
            .map((card, index) => {
                if (typeof card === 'string') {
                    const text = card.trim();
                    if (!text) return null;
                    const executionType = triageMode
                        ? classifyChecklistItem(text)
                        : EXECUTION_TYPES.AI_EXECUTE;
                    const baseCard = {
                        title: text.slice(0, 32),
                        objective: text,
                        prompt: text,
                        deliverable: triageMode
                            ? getDefaultDeliverableByType(executionType, index)
                            : 'A concrete result for this topic.'
                    };
                    return withExecutionMeta(baseCard, executionType, index, text);
                }

                if (!card || typeof card !== 'object') return null;
                const title = String(card.title || card.name || card.topic || card.cardTitle || `Task ${index + 1}`).trim();
                const objective = String(card.objective || card.goal || card.focus || card.task || title).trim();
                const prompt = String(card.prompt || card.instruction || card.content || objective || title).trim();
                const executionType = normalizeExecutionType(
                    card.executionType || card.type || card.mode || card.owner || card.route
                );
                const completionBoundary = String(card.completionBoundary || card.boundary || card.limit || '').trim();
                const quickStart = String(card.quickStart || card.nextAction || card.firstStep || '').trim();
                const deliverable = String(
                    card.deliverable || card.output || card.result || 'A concrete result for this task.'
                ).trim();

                if (!title && !prompt) return null;

                const baseCard = {
                    title: title || prompt.slice(0, 32),
                    objective: objective || prompt,
                    prompt: prompt || objective || title,
                    deliverable
                };
                const hasExecutionHints = !!(card.executionType || card.type || card.mode || card.owner || card.route || completionBoundary || quickStart);

                return withExecutionMeta(
                    baseCard,
                    executionType,
                    index,
                    objective || prompt || title,
                    hasExecutionHints,
                    { completionBoundary, quickStart }
                );
            })
            .filter(Boolean)
            .slice(0, MAX_AGENT_CARDS);

        if (normalizedCards.length === 0) return fallbackPlan;

        const dedupedCards = [];
        const titleCounter = new Map();
        normalizedCards.forEach((card, index) => {
            const baseTitle = trimForCard(card.title || `Task ${index + 1}`, 36) || `Task ${index + 1}`;
            const seenCount = titleCounter.get(baseTitle) || 0;
            titleCounter.set(baseTitle, seenCount + 1);
            const uniqueTitle = seenCount === 0 ? baseTitle : `${baseTitle} (${seenCount + 1})`;

            const baseCard = {
                ...card,
                title: uniqueTitle,
                objective: card.objective || card.prompt || uniqueTitle,
                prompt: card.prompt || card.objective || uniqueTitle,
                deliverable: card.deliverable
            };
            const hasExecutionHints = !!(card.executionType || card.completionBoundary || card.quickStart);
            if (hasExecutionHints || triageMode) {
                dedupedCards.push(
                    withExecutionMeta(
                        baseCard,
                        card.executionType || EXECUTION_TYPES.AI_EXECUTE,
                        index,
                        card.objective || uniqueTitle,
                        hasExecutionHints,
                        {
                            completionBoundary: card.completionBoundary,
                            quickStart: card.quickStart
                        }
                    )
                );
            } else {
                dedupedCards.push(baseCard);
            }
        });

        const cardsToUseBase = checklistItems.length >= 2 && dedupedCards.length < 2
            ? fallbackPlan.cards
            : dedupedCards;
        const cardsToUse = triageMode ? ensureThreeWayCoverage(cardsToUseBase) : cardsToUseBase;

        const planTitle = String(raw.planTitle || raw.title || raw.name || 'AI Agent Plan').trim() || 'AI Agent Plan';
        const strategy = String(raw.strategy || raw.summary || raw.approach || '').trim()
            || 'Break down the goal into focused, executable cards.';

        return {
            planTitle,
            strategy,
            cards: cardsToUse
        };
    };

    const cleanJsonText = (text) => {
        let clean = (text || '').trim();
        if (clean.startsWith('```json')) {
            clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (clean.startsWith('```')) {
            clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const objMatch = clean.match(/\{[\s\S]*\}/);
        if (objMatch) return objMatch[0];
        const arrMatch = clean.match(/\[[\s\S]*\]/);
        if (arrMatch) return arrMatch[0];
        return clean;
    };

    try {
        const checklistBlock = checklistItems.length > 0
            ? checklistItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n')
            : '(none)';
        const hardConstraintBlock = hardConstraints.length > 0
            ? hardConstraints.map((item, idx) => `${idx + 1}. ${item}`).join('\n')
            : '(none)';
        const checklistRule = checklistItems.length >= 2
            ? `HARD CONSTRAINT: The request includes ${Math.min(checklistItems.length, MAX_AGENT_CARDS)} checklist-style items. Create exactly one execution card per item. Do not merge or drop checklist items.`
            : 'If the request naturally includes multiple actionable tasks, split them into separate cards.';
        const triageRule = triageMode
            ? 'HARD CONSTRAINT: The user explicitly asks for 3-way routing. Every card MUST have executionType as one of: ai_execute, ai_guide, user_do. Preserve all three categories in the plan.'
            : 'Default to a general goal-driven plan. Do NOT force any routing taxonomy unless the user explicitly asks for it.';

        const executionTypeDefinitionsBlock = triageMode
            ? `EXECUTION TYPE DEFINITIONS:
- ai_execute: AI can directly complete this card now (content/analysis/code/plan output).
- ai_guide: AI cannot perform the final action itself; provide fastest path, templates, and concrete guidance.
- user_do: Must be completed by the user personally (in-person, approvals, signatures, payments, calls, physical actions). Never claim completion.
`
            : '';
        const triageTaskLine = triageMode
            ? `8. ${triageRule}`
            : `8. ${triageRule}`;
        const outputCardShape = triageMode
            ? `"cards": [
    {
      "title": "card title",
      "objective": "what this card should solve",
      "prompt": "exact worker prompt with constraints preserved",
      "executionType": "ai_execute | ai_guide | user_do",
      "completionBoundary": "what AI can and cannot claim as completed for this card",
      "quickStart": "the first concrete action to start immediately",
      "deliverable": "expected output for this card"
    }
  ]`
            : `"cards": [
    {
      "title": "card title",
      "objective": "what this card should solve",
      "prompt": "exact worker prompt with constraints preserved",
      "deliverable": "expected output for this card"
    }
  ]`;

        const finalPrompt = `You are the planner in a Plan-and-Execute AI agent workflow.
Your job is to transform one user request into an executable card plan that downstream worker agents can run directly.

USER REQUEST:
${fallbackPrompt}

OPTIONAL CONTEXT:
${context || '(none)'}

DETECTED CHECKLIST ITEMS:
${checklistBlock}

DETECTED HARD CONSTRAINTS:
${hardConstraintBlock}

${executionTypeDefinitionsBlock}

TASK:
1. Decide how many cards are needed (between 1 and 20) based on complexity.
2. Assign each card a clear, specific title and one core responsibility.
3. Write a concrete execution prompt for each card that a worker can execute without re-planning.
4. Keep card responsibilities distinct and non-overlapping.
5. Preserve the user's explicit constraints (format, language, exclusions, counts) as non-negotiable requirements in relevant cards.
6. Use the same language as the user request.
7. ${checklistRule}
${triageTaskLine}

PLANNING RULES:
- Prioritize instruction-following over creativity.
- Avoid generic card titles like "Task 1" unless unavoidable.
- If user asks for a strict count/format, encode it directly in card prompts.
- Keep plan minimal but complete; no filler cards.
- Do NOT add quality-review loops or auto-follow-up loops.

OUTPUT FORMAT:
Return ONLY valid JSON, no markdown:
{
  "planTitle": "short plan title",
  "strategy": "one short strategy summary focused on execution",
  ${outputCardShape}
}`;

        const planningContent = Array.isArray(images) && images.length > 0
            ? [
                { type: 'text', text: finalPrompt },
                ...images.slice(0, 3).map(img => ({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: img.mimeType,
                        data: img.base64
                    }
                }))
            ]
            : finalPrompt;

        const response = await chatCompletion(
            [{ role: 'user', content: planningContent }],
            config,
            model,
            options
        );

        if (!response || response.trim().length === 0) {
            return fallbackPlan;
        }

        const parsed = JSON.parse(cleanJsonText(response));
        return normalizePlan(parsed);
    } catch (e) {
        console.error('[AgentPlan] Failed:', e);
        return fallbackPlan;
    }
}
