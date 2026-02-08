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

    const applySearchMetaToLatestAssistant = (cardId, metadata = {}) => {
        const store = useStore.getState();
        const card = store.cards.find(c => c.id === cardId);
        const assistantMsg = card?.data?.messages?.slice().reverse().find(m => m.role === 'assistant');
        if (!assistantMsg?.id || typeof store.setAssistantMessageMeta !== 'function') return;
        store.setAssistantMessageMeta(cardId, assistantMsg.id, {
            usedSearch: metadata.usedSearch === true
        });
    };

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
            } catch (e) {
                debugLog.error(`Expand topic creation failed`, e);
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

        const config = useStore.getState().getRoleConfig('chat');

        try {
            // Dynamic import to avoid circular dependency
            const { generateQuickSproutTopics } = await import('../services/llm');
            const topics = await generateQuickSproutTopics(
                source.data.messages || [],
                config,
                config.model
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
                            model: config.model,
                            providerId: config.providerId
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

        const config = useStore.getState().getRoleConfig('chat');
        try {
            const { generateContinueTopic } = await import('../services/llm');
            const topic = await generateContinueTopic(
                source.data.messages || [],
                config,
                config.model
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
    const handleBranch = async (sourceId, targetMessageId) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source) return;

        const messages = source.data.messages || [];
        if (messages.length === 0) return;

        // 1. Get the target message (or last assistant message if not specified)
        let targetMsg;
        if (targetMessageId) {
            targetMsg = messages.find(m => m.id === targetMessageId);
        } else {
            targetMsg = [...messages].reverse().find(m => m.role === 'assistant');
        }

        if (!targetMsg || !targetMsg.content) return;

        debugLog.ai(`Branching content for card: ${sourceId}, msg: ${targetMsg.id}`);

        const config = useStore.getState().getRoleConfig('chat');

        const content = typeof targetMsg.content === 'string'
            ? targetMsg.content
            : '';

        // 2. Split content using LLM
        debugLog.ai(`Requesting AI text split...`);

        let chunks = [];
        try {
            const { splitTextIntoSections } = await import('../services/llm');
            // Reuse explicit splitting function
            chunks = await splitTextIntoSections(content, config, config.model);
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
                    model: config.model,
                    providerId: config.providerId
                    // No initialMessages -> standard AI generation flow
                });

                // Build context from source card UP TO and including the target message
                const targetIndex = messages.findIndex(m => m.id === targetMsg.id);
                const contextEndIndex = targetIndex >= 0 ? targetIndex + 1 : messages.length;
                const contextMessages = messages.slice(Math.max(0, contextEndIndex - 6), contextEndIndex);
                const sourceContext = contextMessages
                    .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${typeof m.content === 'string' ? m.content : (m.text || '')}`)
                    .join('\n');

                try {
                    // Trigger AI generation for "Deep Dive"
                    // Use clear markers so AI can distinguish imported context from current topic
                    const branchPrompt = `
╔══════════════════════════════════════════════════════════════╗
║  📥 IMPORTED REFERENCE CONTEXT (from parent conversation)   ║
║  This is background info only. Do NOT treat as current chat ║
╚══════════════════════════════════════════════════════════════╝
${sourceContext}

╔══════════════════════════════════════════════════════════════╗
║  🎯 THIS CARD'S FOCUS TOPIC (your primary task)             ║
║  This is what this card is about. Focus on this.            ║
╚══════════════════════════════════════════════════════════════╝
${cleanChunk}

══════════════════════════════════════════════════════════════
INSTRUCTION: Based on the reference context above, provide a deeper explanation, analysis, or additional details about the FOCUS TOPIC. 
Important: In future messages in this card, focus ONLY on the topic above. The "IMPORTED REFERENCE CONTEXT" is just background - future questions will be about expanding this specific topic.
Respond in the same language as the focus topic.
══════════════════════════════════════════════════════════════`.trim();

                    await aiManager.requestTask({
                        type: 'chat',
                        priority: PRIORITY.HIGH,
                        payload: {
                            messages: [{
                                role: 'user',
                                content: branchPrompt
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
                    debugLog.ai(`Branch generation complete for: ${newId}`);
                } catch (innerError) {
                    debugLog.error(`Branch generation failed for ${newId}`, innerError);
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
            const { generateDirectedCards } = await import('../services/llm');
            const contents = await generateDirectedCards(
                (source.data.messages || []).slice(-6),
                instruction,
                config,
                config.model
            );

            if (!contents || contents.length === 0) {
                // User feedback: AI didn't generate any content
                console.warn('[DirectedSprout] No content generated by AI');
                return;
            }

            // Calculate positions using mindmap layout
            const positions = calculateMindmapChildPositions(source, contents.length);

            contents.forEach((content, i) => {
                (async () => {
                    const newId = uuid();
                    const pos = positions[i];

                    await createAICard({
                        id: newId,
                        text: content,
                        x: pos.x,
                        y: pos.y,
                        autoConnections: [{ from: sourceId, to: newId }],
                        model: config.model,
                        providerId: config.providerId
                    });

                    // Build context from source and trigger AI elaboration
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

        } catch (e) {
            debugLog.error('Directed sprout failed', e);
        }
    };

    return { handleExpandTopics, handleSprout, handleQuickSprout, handleContinueTopic, handleBranch, handleDirectedSprout };
}
