import { uuid } from '../../utils/uuid';
import { useStore } from '../../store/useStore';
import { aiManager, PRIORITY } from '../../services/ai/AIManager';
import { debugLog } from '../../utils/debugLogger';
import {
    applySearchMetaToLatestAssistant,
    buildConversationContext,
    buildTargetConversationContext,
    calculateMindmapChildPositions
} from './shared';

export const createSproutHandlers = ({
    cards,
    createAICard,
    updateCardContent,
    setCardGenerating
}) => {
    const handleExpandTopics = async (sourceId) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source || !source.data.marks) return;

        debugLog.ai(`Expanding topics for card: ${sourceId}`, { count: source.data.marks.length });

        const config = useStore.getState().getRoleConfig('chat');

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
                    model: config.model,
                    providerId: config.providerId
                });

                try {
                    await aiManager.requestTask({
                        type: 'chat',
                        priority: PRIORITY.HIGH,
                        payload: {
                            messages: [{ role: 'user', content: mark }],
                            model: config.model,
                            config,
                            options: {
                                onResponseMetadata: (metadata = {}) => applySearchMetaToLatestAssistant(newId, metadata)
                            }
                        },
                        tags: [`card:${generatedId}`],
                        onProgress: (chunk) => updateCardContent(newId, chunk)
                    });
                    debugLog.ai(`Topic expansion complete for: ${generatedId}`);
                } catch (innerError) {
                    debugLog.error(`Expand topic failed for ${generatedId}`, innerError);
                    updateCardContent(newId, `\n\n⚠️ **生成失败**: ${innerError.message}`);
                } finally {
                    setCardGenerating(newId, false);
                }
            } catch (error) {
                debugLog.error('Expand topic creation failed', error);
            }
        });
    };

    const handleSprout = async (sourceId, topics) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source || !topics.length) return;

        debugLog.ai(`Sprouting ideas for card: ${sourceId}`, { topicsCount: topics.length });

        const config = useStore.getState().getRoleConfig('chat');

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
                        model: config.model,
                        providerId: config.providerId
                    });

                    const sourceContext = buildConversationContext(source.data.messages || []);

                    try {
                        await aiManager.requestTask({
                            type: 'chat',
                            priority: PRIORITY.HIGH,
                            payload: {
                                messages: [{
                                    role: 'user',
                                    content: `[Previous Context]\n${sourceContext}\n\n[New Topic to Explore]\n${question}\n\nBased on the previous context, please elaborate on this topic in detail.`
                                }],
                                model: config.model,
                                config,
                                options: {
                                    onResponseMetadata: (metadata = {}) => applySearchMetaToLatestAssistant(newId, metadata)
                                }
                            },
                            tags: [`card:${newId}`],
                            onProgress: (chunk) => updateCardContent(newId, chunk)
                        });
                        debugLog.ai(`Sprout generation complete for: ${newId}`);
                    } catch (innerError) {
                        debugLog.error(`Sprout generation failed for ${newId}`, innerError);
                        updateCardContent(newId, `\n\n⚠️ **生成失败**: ${innerError.message}`);
                    } finally {
                        setCardGenerating(newId, false);
                    }
                } catch (error) {
                    debugLog.error('Sprout creation failed', error);
                }
            })();
        });
    };

    const handleQuickSprout = async (sourceId) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source) return;

        debugLog.ai(`Quick sprouting for card: ${sourceId}`);

        const config = useStore.getState().getRoleConfig('chat');

        try {
            const { generateQuickSproutTopics } = await import('../../services/llm');
            const topics = await generateQuickSproutTopics(
                source.data.messages || [],
                config,
                config.model
            );

            debugLog.ai('Quick sprout topics generated:', topics);

            if (topics && topics.length > 0) {
                const positions = calculateMindmapChildPositions(source, topics.length);

                topics.forEach((topic, index) => {
                    (async () => {
                        const newId = uuid();
                        const pos = positions[index];

                        debugLog.ai(`Creating quick sprouted card: ${newId} at (${pos.x}, ${pos.y})`, { topic });

                        await createAICard({
                            id: newId,
                            text: topic,
                            x: pos.x,
                            y: pos.y,
                            autoConnections: [{ from: sourceId, to: newId }],
                            model: config.model,
                            providerId: config.providerId
                        });

                        const sourceContext = buildConversationContext(source.data.messages || []);

                        try {
                            await aiManager.requestTask({
                                type: 'chat',
                                priority: PRIORITY.HIGH,
                                payload: {
                                    messages: [{
                                        role: 'user',
                                        content: `[Previous Context]\n${sourceContext}\n\n[Topic to Explore]\n${topic}\n\nBased on the previous context, please provide a deeper explanation, analysis, or additional details about this specific point.`
                                    }],
                                    model: config.model,
                                    config,
                                    options: {
                                        onResponseMetadata: (metadata = {}) => applySearchMetaToLatestAssistant(newId, metadata)
                                    }
                                },
                                tags: [`card:${newId}`],
                                onProgress: (chunk) => updateCardContent(newId, chunk)
                            });
                            debugLog.ai(`Quick sprout generation complete for: ${newId}`);
                        } catch (innerError) {
                            debugLog.error(`Quick sprout generation failed for ${newId}`, innerError);
                            updateCardContent(newId, `\n\n⚠️ **生成失败**: ${innerError.message}`);
                        } finally {
                            setCardGenerating(newId, false);
                        }
                    })();
                });
            }
        } catch (error) {
            debugLog.error('Quick sprout failed', error);
        }
    };

    const handleContinueTopic = async (cardId, onSendMessage) => {
        const source = cards.find(c => c.id === cardId);
        if (!source) return;

        debugLog.ai(`Continue topic for card: ${cardId}`);

        const config = useStore.getState().getRoleConfig('chat');
        try {
            const { generateContinueTopic } = await import('../../services/llm');
            const topic = await generateContinueTopic(
                source.data.messages || [],
                config,
                config.model
            );

            debugLog.ai('Continue topic generated:', topic);

            if (topic && onSendMessage) {
                onSendMessage(topic);
            }
        } catch (error) {
            debugLog.error('Continue topic failed', error);
        }
    };

    const handleBranch = async (sourceId, targetMessageId) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source) return;

        const messages = source.data.messages || [];
        if (messages.length === 0) return;

        const targetMsg = targetMessageId
            ? messages.find(m => m.id === targetMessageId)
            : [...messages].reverse().find(m => m.role === 'assistant');

        if (!targetMsg || !targetMsg.content) return;

        debugLog.ai(`Branching content for card: ${sourceId}, msg: ${targetMsg.id}`);

        const config = useStore.getState().getRoleConfig('chat');
        const content = typeof targetMsg.content === 'string' ? targetMsg.content : '';

        debugLog.ai('Requesting AI text split...');

        let chunks = [];
        try {
            const { splitTextIntoSections } = await import('../../services/llm');
            chunks = await splitTextIntoSections(content, config, config.model);
        } catch (error) {
            console.error('AI split failed, falling back to basic split', error);
            chunks = content.split(/\n\s*\n/).filter(c => c.trim().length > 10).slice(0, 4);
        }

        if (!chunks || chunks.length === 0) return;

        debugLog.ai('Branch chunks to create:', chunks.length);

        const positions = calculateMindmapChildPositions(source, chunks.length);

        chunks.forEach((chunk, index) => {
            (async () => {
                const newId = uuid();
                const pos = positions[index];
                const cleanChunk = chunk.trim();
                const cardTitle = cleanChunk.slice(0, 40) + (cleanChunk.length > 40 ? '...' : '');

                debugLog.ai(`Creating branch card: ${newId}`, { title: cardTitle });

                await createAICard({
                    id: newId,
                    text: cleanChunk,
                    x: pos.x,
                    y: pos.y,
                    autoConnections: [{ from: sourceId, to: newId }],
                    model: config.model,
                    providerId: config.providerId
                });

                const sourceContext = buildTargetConversationContext(messages, targetMsg.id);
                const branchPrompt = `
╔══════════════════════════════════════════════════════════════╗
║  📥 IMPORTED REFERENCE CONTEXT (from parent conversation)   ║
║  This is background info only. Do NOT treat as current chat ║
╚══════════════════════════════════════════════════════════════╝

${sourceContext}

═══════════════════════════════════════════════════════════════

[Current Topic / 当前主题]
${cleanChunk}

[Task / 任务]
Based on the imported context, expand ONLY the current topic in depth. Add concrete detail, explanation, and implications. Do not repeat the full parent answer.
                `.trim();

                try {
                    await aiManager.requestTask({
                        type: 'chat',
                        priority: PRIORITY.HIGH,
                        payload: {
                            messages: [{ role: 'user', content: branchPrompt }],
                            model: config.model,
                            config,
                            options: {
                                onResponseMetadata: (metadata = {}) => applySearchMetaToLatestAssistant(newId, metadata)
                            }
                        },
                        tags: [`card:${newId}`],
                        onProgress: (chunkText) => updateCardContent(newId, chunkText)
                    });
                } catch (innerError) {
                    updateCardContent(newId, `\n\n⚠️ **生成失败**: ${innerError.message}`);
                } finally {
                    setCardGenerating(newId, false);
                }
            })();
        });
    };

    const handleDirectedSprout = async (sourceId, instruction) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source || !instruction) return;

        debugLog.ai(`Directed sprout for card: ${sourceId}`, { instruction });

        const config = useStore.getState().getRoleConfig('chat');

        try {
            const { generateDirectedCards } = await import('../../services/llm');
            const contents = await generateDirectedCards(
                (source.data.messages || []).slice(-6),
                instruction,
                config,
                config.model
            );

            if (!contents || contents.length === 0) {
                console.warn('[DirectedSprout] No content generated by AI');
                return;
            }

            const positions = calculateMindmapChildPositions(source, contents.length);

            contents.forEach((content, index) => {
                (async () => {
                    const newId = uuid();
                    const pos = positions[index];

                    await createAICard({
                        id: newId,
                        text: content,
                        x: pos.x,
                        y: pos.y,
                        autoConnections: [{ from: sourceId, to: newId }],
                        model: config.model,
                        providerId: config.providerId
                    });

                    const sourceContext = buildConversationContext(source.data.messages || []);

                    try {
                        await aiManager.requestTask({
                            type: 'chat',
                            priority: PRIORITY.HIGH,
                            payload: {
                                messages: [{
                                    role: 'user',
                                    content: `[Previous Context]\n${sourceContext}\n\n[Topic/Instruction]\n${content}\n\nBased on this topic, please elaborate or fulfill the implied request.`
                                }],
                                model: config.model,
                                config,
                                options: {
                                    onResponseMetadata: (metadata = {}) => applySearchMetaToLatestAssistant(newId, metadata)
                                }
                            },
                            tags: [`card:${newId}`],
                            onProgress: (chunk) => updateCardContent(newId, chunk)
                        });
                    } catch (innerError) {
                        updateCardContent(newId, `\n\n⚠️ **生成失败**: ${innerError.message}`);
                    } finally {
                        setCardGenerating(newId, false);
                    }
                })();
            });
        } catch (error) {
            debugLog.error('Directed sprout failed', error);
        }
    };

    return {
        handleExpandTopics,
        handleSprout,
        handleQuickSprout,
        handleContinueTopic,
        handleBranch,
        handleDirectedSprout
    };
};
