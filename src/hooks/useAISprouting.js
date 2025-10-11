import { uuid } from '../utils/uuid';
import { useStore } from '../store/useStore';
import { aiManager, PRIORITY } from '../services/ai/AIManager';
import { debugLog } from '../utils/debugLogger';
import { CARD_GEOMETRY } from '../utils/geometry';

/**
 * Hook to handle AI branching operations like "sprouting" new ideas 
 * or expanding marked topics into new cards.
 */
export function useAISprouting() {
    const {
        cards,
        createAICard,
        updateCardContent,
        setCardGenerating
    } = useStore();

    /**
     * Calculate standard mindmap layout for child cards.
     * Children are positioned to the right of the parent, vertically centered.
     * This is exactly how MindNode/XMind layout their nodes.
     * 
     * @param {Object} parent - Parent card {x, y}
     * @param {number} childCount - Number of children to position
     * @returns {Array} Array of {x, y} positions for each child
     */
    const calculateMindmapChildPositions = (parent, childCount) => {
        const CARD_WIDTH = CARD_GEOMETRY.standard.width;   // 320
        const CARD_HEIGHT = CARD_GEOMETRY.standard.height; // 300
        const HORIZONTAL_GAP = 130; // Gap between parent and children
        const VERTICAL_GAP = 50;    // Gap between siblings

        // All children are at the same X (to the right of parent)
        const childX = parent.x + CARD_WIDTH + HORIZONTAL_GAP;

        // Total height taken by all children
        const totalHeight = childCount * CARD_HEIGHT + (childCount - 1) * VERTICAL_GAP;

        // Start Y: center children around parent's center
        const parentCenterY = parent.y + CARD_HEIGHT / 2;
        const startY = parentCenterY - totalHeight / 2;

        // Generate positions for each child
        const positions = [];
        for (let i = 0; i < childCount; i++) {
            positions.push({
                x: childX,
                y: startY + i * (CARD_HEIGHT + VERTICAL_GAP)
            });
        }

        return positions;
    };

    const handleExpandTopics = async (sourceId) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source || !source.data.marks) return;

        debugLog.ai(`Expanding topics for card: ${sourceId}`, { count: source.data.marks.length });

        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const chatModel = state.getRoleModel('chat');

        source.data.marks.map(async (mark, index) => {
            try {
                const newY = source.y + (index * 320) - ((source.data.marks.length * 320) / 2) + 150;
                const generatedId = uuid();

                debugLog.ai(`Creating expanded topic card: ${generatedId}`, { topic: mark });

                const newId = await createAICard({
                    id: generatedId,
                    text: mark,
                    x: source.x + 400,
                    y: newY,
                    autoConnections: [{ from: sourceId, to: generatedId }],
                    model: chatModel,
                    providerId: activeConfig.id
                });

                try {
                    await aiManager.requestTask({
                        type: 'chat',
                        priority: PRIORITY.HIGH,
                        payload: {
                            messages: [{ role: 'user', content: mark }],
                            model: chatModel,
                            config: activeConfig
                        },
                        tags: [`card:${generatedId}`],
                        onProgress: (chunk) => updateCardContent(newId, chunk)
                    });
                    debugLog.ai(`Topic expansion complete for: ${generatedId}`);
                } catch (innerError) {
                    debugLog.error(`Expand topic failed for ${generatedId}`, innerError);
                    const errMsg = innerError.message || 'Generation failed';
                    const userMessage = errMsg.toLowerCase().includes('upstream') || errMsg.toLowerCase().includes('unavailable')
                        ? `\n\n⚠️ **AI服务暂时不可用**\n服务器繁忙，请稍后重试。`
                        : `\n\n⚠️ **生成失败**: ${errMsg}`;
                    updateCardContent(newId, userMessage);
                } finally {
                    setCardGenerating(newId, false);
                }
            } catch (e) {
                debugLog.error(`Expand topic creation failed`, e);
            }
        });
    };

    const handleSprout = async (sourceId, topics) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source || !topics.length) return;

        debugLog.ai(`Sprouting ideas for card: ${sourceId}`, { topicsCount: topics.length });

        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const chatModel = state.getRoleModel('chat');

        const CARD_HEIGHT = 400;
        const totalHeight = topics.length * CARD_HEIGHT;
        const startY = source.y - (totalHeight / 2) + (CARD_HEIGHT / 2);

        topics.forEach((question, index) => {
            (async () => {
                try {
                    const newY = startY + (index * CARD_HEIGHT);
                    const newId = uuid();

                    debugLog.ai(`Creating sprouted card: ${newId}`, { question });

                    await createAICard({
                        id: newId,
                        text: question,
                        x: source.x + 450,
                        y: newY,
                        autoConnections: [{ from: sourceId, to: newId }],
                        model: chatModel,
                        providerId: activeConfig.id
                    });

                    // Build context from source card's conversation (last 4 messages for context)
                    const sourceContext = (source.data.messages || []).slice(-4)
                        .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${typeof m.content === 'string' ? m.content : (m.text || '')}`)
                        .join('\n');

                    try {
                        await aiManager.requestTask({
                            type: 'chat',
                            priority: PRIORITY.HIGH,
                            payload: {
                                messages: [{
                                    role: 'user',
                                    content: `[Previous Context]\n${sourceContext}\n\n[New Topic to Explore]\n${question}\n\nBased on the previous context, please elaborate on this topic in detail.`
                                }],
                                model: chatModel,
                                config: activeConfig
                            },
                            tags: [`card:${newId}`],
                            onProgress: (chunk) => updateCardContent(newId, chunk)
                        });
                        debugLog.ai(`Sprout generation complete for: ${newId}`);
                    } catch (innerError) {
                        debugLog.error(`Sprout generation failed for ${newId}`, innerError);
                        const errMsg = innerError.message || 'Generation failed';
                        const userMessage = errMsg.toLowerCase().includes('upstream') || errMsg.toLowerCase().includes('unavailable')
                            ? `\n\n⚠️ **AI服务暂时不可用**\n服务器繁忙，请稍后重试。`
                            : `\n\n⚠️ **生成失败**: ${errMsg}`;
                        updateCardContent(newId, userMessage);
                    } finally {
                        setCardGenerating(newId, false);
                    }
                } catch (e) {
                    debugLog.error(`Sprout creation failed`, e);
                }
            })();
        });
    };

    /**
     * Quick Sprout: Auto-generate 3 related cards without user selection
     * Uses topic decomposition strategy for better accuracy
     * This is a SEPARATE feature from the original Sprout
     */
    const handleQuickSprout = async (sourceId) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source) return;

        debugLog.ai(`Quick sprouting for card: ${sourceId}`);

        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const analysisModel = state.getRoleModel('analysis');
        const chatModel = state.getRoleModel('chat');

        try {
            // Dynamic import to avoid circular dependency
            const { generateQuickSproutTopics } = await import('../services/llm');
            const topics = await generateQuickSproutTopics(
                source.data.messages || [],
                activeConfig,
                analysisModel
            );

            debugLog.ai(`Quick sprout topics generated:`, topics);

            // Create cards using standard mindmap layout
            if (topics && topics.length > 0) {
                // Calculate positions using mindmap layout
                const positions = calculateMindmapChildPositions(source, topics.length);

                topics.forEach((topic, i) => {
                    (async () => {
                        const newId = uuid();
                        const pos = positions[i];

                        debugLog.ai(`Creating quick sprouted card: ${newId} at (${pos.x}, ${pos.y})`, { topic });

                        await createAICard({
                            id: newId,
                            text: topic,
                            x: pos.x,
                            y: pos.y,
                            autoConnections: [{ from: sourceId, to: newId }],
                            model: chatModel,
                            providerId: activeConfig.id
                        });

                        // Build context from source card's conversation (last 4 messages for context)
                        const sourceContext = (source.data.messages || []).slice(-4)
                            .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${typeof m.content === 'string' ? m.content : (m.text || '')}`)
                            .join('\n');

                        try {
                            await aiManager.requestTask({
                                type: 'chat',
                                priority: PRIORITY.HIGH,
                                payload: {
                                    messages: [{
                                        role: 'user',
                                        content: `[Previous Context]\n${sourceContext}\n\n[Topic to Explore]\n${topic}\n\nBased on the previous context, please elaborate on this topic in detail.`
                                    }],
                                    model: chatModel,
                                    config: activeConfig
                                },
                                tags: [`card:${newId}`],
                                onProgress: (chunk) => updateCardContent(newId, chunk)
                            });
                            debugLog.ai(`Quick sprout generation complete for: ${newId}`);
                        } catch (innerError) {
                            debugLog.error(`Quick sprout generation failed for ${newId}`, innerError);
                            const errMsg = innerError.message || 'Generation failed';
                            const userMessage = errMsg.toLowerCase().includes('upstream') || errMsg.toLowerCase().includes('unavailable')
                                ? `\n\n⚠️ **AI服务暂时不可用**\n服务器繁忙，请稍后重试。`
                                : `\n\n⚠️ **生成失败**: ${errMsg}`;
                            updateCardContent(newId, userMessage);
                        } finally {
                            setCardGenerating(newId, false);
                        }
                    })();
                });
            }
        } catch (e) {
            debugLog.error(`Quick sprout failed`, e);
        }
    };

    /**
     * Continue Topic: Generate 1 follow-up question and add to current card's conversation
     * Does NOT create new cards - stays in current conversation
     */
    const handleContinueTopic = async (cardId, onSendMessage) => {
        const source = cards.find(c => c.id === cardId);
        if (!source) return;

        debugLog.ai(`Continue topic for card: ${cardId}`);

        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const analysisModel = state.getRoleModel('analysis');

        try {
            const { generateContinueTopic } = await import('../services/llm');
            const topic = await generateContinueTopic(
                source.data.messages || [],
                activeConfig,
                analysisModel
            );

            debugLog.ai(`Continue topic generated:`, topic);

            // Send the generated topic as a new message in the current card
            if (topic && onSendMessage) {
                onSendMessage(topic);
            }
        } catch (e) {
            debugLog.error(`Continue topic failed`, e);
        }
    };

    /**
     * Branch: Split the LAST assistant response into separate cards for deep dive
     * 1. Uses AI to split text into logical sections / exact substrings
     * 2. Creates new cards using these substrings as PROMPTS
     * 3. AI generates detailed explanation for each substring
     */
    const handleBranch = async (sourceId) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source) return;

        const messages = source.data.messages || [];
        if (messages.length === 0) return;

        // 1. Get the last assistant message
        const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
        if (!lastAssistantMsg || !lastAssistantMsg.content) return;

        debugLog.ai(`Branching content for card: ${sourceId}`);

        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const chatModel = state.getRoleModel('chat');
        // Use analysis model for splitting task if available
        const analysisModel = state.getRoleModel('analysis') || chatModel;

        const content = typeof lastAssistantMsg.content === 'string'
            ? lastAssistantMsg.content
            : '';

        // 2. Split content using LLM
        debugLog.ai(`Requesting AI text split...`);

        let chunks = [];
        try {
            const { splitTextIntoSections } = await import('../services/llm');
            // Reuse explicit splitting function
            chunks = await splitTextIntoSections(content, activeConfig, analysisModel);
        } catch (e) {
            console.error("AI split failed, falling back to basic split", e);
            chunks = content.split(/\n\s*\n/).filter(c => c.trim().length > 10).slice(0, 4);
        }

        if (!chunks || chunks.length === 0) return;

        debugLog.ai(`Branch chunks to create:`, chunks.length);

        // Calculate positions using mindmap layout
        const positions = calculateMindmapChildPositions(source, chunks.length);

        chunks.forEach((chunk, i) => {
            (async () => {
                const newId = uuid();
                const pos = positions[i];
                const cleanChunk = chunk.trim();

                // Use start of chunk as title (for UI)
                const cardTitle = cleanChunk.slice(0, 40) + (cleanChunk.length > 40 ? '...' : '');

                debugLog.ai(`Creating branch card: ${newId}`, { title: cardTitle });

                // Create card: Use the CHUNK as the User's Prompt text
                await createAICard({
                    id: newId,
                    text: cleanChunk, // Full chunk as prompt
                    x: pos.x,
                    y: pos.y,
                    autoConnections: [{ from: sourceId, to: newId }],
                    model: chatModel,
                    providerId: activeConfig.id
                    // No initialMessages -> standard AI generation flow
                });

                // Build context from source card
                const sourceContext = (source.data.messages || []).slice(-6)
                    .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${typeof m.content === 'string' ? m.content : (m.text || '')}`)
                    .join('\n');

                try {
                    // Trigger AI generation for "Deep Dive"
                    await aiManager.requestTask({
                        type: 'chat',
                        priority: PRIORITY.HIGH,
                        payload: {
                            messages: [{
                                role: 'user',
                                content: `[Previous Context]\n${sourceContext}\n\n[Focus Topic]\n${cleanChunk}\n\nBased on the context, please provide a deeper explanation, analysis, or additional details about this specific point.`
                            }],
                            model: chatModel,
                            config: activeConfig
                        },
                        tags: [`card:${newId}`],
                        onProgress: (chunk) => updateCardContent(newId, chunk)
                    });
                    debugLog.ai(`Branch generation complete for: ${newId}`);
                } catch (innerError) {
                    debugLog.error(`Branch generation failed for ${newId}`, innerError);
                    const errMsg = innerError.message || 'Generation failed';
                    const userMessage = errMsg.toLowerCase().includes('upstream') || errMsg.toLowerCase().includes('unavailable')
                        ? `\n\n⚠️ **AI服务暂时不可用**\n服务器繁忙，请稍后重试。`
                        : `\n\n⚠️ **生成失败**: ${errMsg}`;
                    updateCardContent(newId, userMessage);
                } finally {
                    setCardGenerating(newId, false);
                }
            })();
        });
    };

    return { handleExpandTopics, handleSprout, handleQuickSprout, handleContinueTopic, handleBranch };
}
