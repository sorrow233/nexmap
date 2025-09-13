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

    // Helper: Check if a position overlaps with any existing card
    const findNonOverlappingY = (baseX, baseY, existingCards, cardHeight = 400, margin = 50) => {
        const CARD_WIDTH = CARD_GEOMETRY.standard.width;
        let candidateY = baseY;
        let attempts = 0;
        const maxAttempts = 20;

        while (attempts < maxAttempts) {
            const hasOverlap = existingCards.some(c => {
                const cHeight = CARD_GEOMETRY[c.type || 'standard']?.height || 300;
                return (
                    Math.abs(c.x - baseX) < CARD_WIDTH + margin &&
                    candidateY < c.y + cHeight + margin &&
                    candidateY + cardHeight > c.y - margin
                );
            });

            if (!hasOverlap) {
                return candidateY;
            }

            candidateY += cardHeight + margin;
            attempts++;
        }

        return candidateY; // Fallback after max attempts
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

                    try {
                        await aiManager.requestTask({
                            type: 'chat',
                            priority: PRIORITY.HIGH,
                            payload: {
                                messages: [{
                                    role: 'user',
                                    content: question
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

            // Create cards using collision detection
            if (topics && topics.length > 0) {
                const CARD_HEIGHT = 400;
                const baseX = source.x + 450;
                let baseY = source.y;

                // Get current cards plus track newly created ones
                const currentCards = [...cards];

                for (let i = 0; i < topics.length; i++) {
                    const topic = topics[i];
                    const newId = uuid();

                    // Find Y position that doesn't overlap with existing cards
                    const newY = findNonOverlappingY(baseX, baseY, currentCards, CARD_HEIGHT, 50);

                    debugLog.ai(`Creating quick sprouted card: ${newId} at y=${newY}`, { topic });

                    // Add to tracking array to prevent next card from overlapping this one
                    currentCards.push({ id: newId, x: baseX, y: newY, type: 'standard' });

                    await createAICard({
                        id: newId,
                        text: topic,
                        x: baseX,
                        y: newY,
                        autoConnections: [{ from: sourceId, to: newId }],
                        model: chatModel,
                        providerId: activeConfig.id
                    });

                    // Update baseY for next card
                    baseY = newY + CARD_HEIGHT + 50;

                    try {
                        await aiManager.requestTask({
                            type: 'chat',
                            priority: PRIORITY.HIGH,
                            payload: {
                                messages: [{ role: 'user', content: topic }],
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
                    }
                }
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
     * Branch: Extract all topics from conversation and create separate cards for each
     * Creates N new cards (one per topic detected)
     */
    const handleBranch = async (sourceId) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source) return;

        debugLog.ai(`Branching conversation for card: ${sourceId}`);

        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const analysisModel = state.getRoleModel('analysis');
        const chatModel = state.getRoleModel('chat');

        try {
            const { extractConversationTopics } = await import('../services/llm');
            const topics = await extractConversationTopics(
                source.data.messages || [],
                activeConfig,
                analysisModel
            );

            debugLog.ai(`Branch topics extracted:`, topics);

            // Create cards using collision detection
            if (topics && topics.length > 0) {
                const CARD_HEIGHT = 400;
                const baseX = source.x + 450;
                let baseY = source.y;

                // Get current cards plus track newly created ones
                const currentCards = [...cards];

                for (let i = 0; i < topics.length; i++) {
                    const topic = topics[i];
                    const newId = uuid();

                    // Find Y position that doesn't overlap with existing cards
                    const newY = findNonOverlappingY(baseX, baseY, currentCards, CARD_HEIGHT, 50);

                    debugLog.ai(`Creating branch card: ${newId} at y=${newY}`, { topic });

                    // Add to tracking array to prevent next card from overlapping this one
                    currentCards.push({ id: newId, x: baseX, y: newY, type: 'standard' });

                    await createAICard({
                        id: newId,
                        text: topic,
                        x: baseX,
                        y: newY,
                        autoConnections: [{ from: sourceId, to: newId }],
                        model: chatModel,
                        providerId: activeConfig.id
                    });

                    // Update baseY for next card
                    baseY = newY + CARD_HEIGHT + 50;

                    try {
                        await aiManager.requestTask({
                            type: 'chat',
                            priority: PRIORITY.HIGH,
                            payload: {
                                messages: [{ role: 'user', content: `请详细介绍: ${topic}` }],
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
                    }
                }
            }
        } catch (e) {
            debugLog.error(`Branch failed`, e);
        }
    };

    return { handleExpandTopics, handleSprout, handleQuickSprout, handleContinueTopic, handleBranch };
}
