import { uuid } from '../utils/uuid';
import { useStore } from '../store/useStore';
import { aiManager, PRIORITY } from '../services/ai/AIManager';
import { debugLog } from '../utils/debugLogger';

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

            // Create cards using the same layout logic as handleSprout
            if (topics && topics.length > 0) {
                const CARD_HEIGHT = 400;
                const totalHeight = topics.length * CARD_HEIGHT;
                const startY = source.y - (totalHeight / 2) + (CARD_HEIGHT / 2);

                topics.forEach((topic, index) => {
                    (async () => {
                        try {
                            const newY = startY + (index * CARD_HEIGHT);
                            const newId = uuid();

                            debugLog.ai(`Creating quick sprouted card: ${newId}`, { topic });

                            await createAICard({
                                id: newId,
                                text: topic,
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
                            } finally {
                                setCardGenerating(newId, false);
                            }
                        } catch (e) {
                            debugLog.error(`Quick sprout creation failed`, e);
                        }
                    })();
                });
            }
        } catch (e) {
            debugLog.error(`Quick sprout failed`, e);
        }
    };

    return { handleExpandTopics, handleSprout, handleQuickSprout };
}
