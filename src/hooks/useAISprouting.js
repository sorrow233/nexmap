import { uuid } from '../utils/uuid';
import { useStore } from '../store/useStore';
import { debugLog } from '../utils/debugLogger';
import { calculateMindmapChildPositions } from '../utils/mindmapUtils';
import { streamToCard } from '../services/ai/streamToCard';

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

                // Create Card
                const newId = await createAICard({
                    id: generatedId,
                    text: mark,
                    x: source.x + 400,
                    y: newY,
                    autoConnections: [{ from: sourceId, to: generatedId }],
                    model: chatModel,
                    providerId: activeConfig.id
                });

                // Stream Content
                await streamToCard({
                    cardId: newId,
                    messages: [{ role: 'user', content: mark }],
                    config: activeConfig,
                    model: chatModel,
                    updateCardContent,
                    setCardGenerating
                });

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

                    // Build context
                    const sourceContext = (source.data.messages || []).slice(-4)
                        .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${typeof m.content === 'string' ? m.content : (m.text || '')}`)
                        .join('\n');

                    // Stream Content
                    await streamToCard({
                        cardId: newId,
                        messages: [{
                            role: 'user',
                            content: `[Previous Context]\n${sourceContext}\n\n[New Topic to Explore]\n${question}\n\nBased on the previous context, please elaborate on this topic in detail.`
                        }],
                        config: activeConfig,
                        model: chatModel,
                        updateCardContent,
                        setCardGenerating
                    });

                } catch (e) {
                    debugLog.error(`Sprout creation failed`, e);
                }
            })();
        });
    };

    const handleQuickSprout = async (sourceId) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source) return;

        debugLog.ai(`Quick sprouting for card: ${sourceId}`);

        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const analysisModel = state.getRoleModel('analysis');
        const chatModel = state.getRoleModel('chat');

        try {
            const { generateQuickSproutTopics } = await import('../services/llm');
            const topics = await generateQuickSproutTopics(
                source.data.messages || [],
                activeConfig,
                analysisModel
            );

            debugLog.ai(`Quick sprout topics generated:`, topics);

            if (topics && topics.length > 0) {
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

                        const sourceContext = (source.data.messages || []).slice(-4)
                            .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${typeof m.content === 'string' ? m.content : (m.text || '')}`)
                            .join('\n');

                        await streamToCard({
                            cardId: newId,
                            messages: [{
                                role: 'user',
                                content: `[Previous Context]\n${sourceContext}\n\n[Topic to Explore]\n${topic}\n\nBased on the previous context, please elaborate on this topic in detail.`
                            }],
                            config: activeConfig,
                            model: chatModel,
                            updateCardContent,
                            setCardGenerating
                        });
                    })();
                });
            }
        } catch (e) {
            debugLog.error(`Quick sprout failed`, e);
        }
    };

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
            if (topic && onSendMessage) {
                onSendMessage(topic);
            }
        } catch (e) {
            debugLog.error(`Continue topic failed`, e);
        }
    };

    const handleBranch = async (sourceId) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source) return;

        const messages = source.data.messages || [];
        if (messages.length === 0) return;

        const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
        if (!lastAssistantMsg || !lastAssistantMsg.content) return;

        debugLog.ai(`Branching content for card: ${sourceId}`);

        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const chatModel = state.getRoleModel('chat');
        const analysisModel = state.getRoleModel('analysis') || chatModel;

        const content = typeof lastAssistantMsg.content === 'string' ? lastAssistantMsg.content : '';

        debugLog.ai(`Requesting AI text split...`);

        let chunks = [];
        try {
            const { splitTextIntoSections } = await import('../services/llm');
            chunks = await splitTextIntoSections(content, activeConfig, analysisModel);
        } catch (e) {
            console.error("AI split failed, falling back to basic split", e);
            chunks = content.split(/\n\s*\n/).filter(c => c.trim().length > 10).slice(0, 4);
        }

        if (!chunks || chunks.length === 0) return;

        debugLog.ai(`Branch chunks to create:`, chunks.length);

        const positions = calculateMindmapChildPositions(source, chunks.length);

        chunks.forEach((chunk, i) => {
            (async () => {
                const newId = uuid();
                const pos = positions[i];
                const cleanChunk = chunk.trim();
                const cardTitle = cleanChunk.slice(0, 40) + (cleanChunk.length > 40 ? '...' : '');

                debugLog.ai(`Creating branch card: ${newId}`, { title: cardTitle });

                await createAICard({
                    id: newId,
                    text: cleanChunk,
                    x: pos.x,
                    y: pos.y,
                    autoConnections: [{ from: sourceId, to: newId }],
                    model: chatModel,
                    providerId: activeConfig.id
                });

                const sourceContext = (source.data.messages || []).slice(-6)
                    .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${typeof m.content === 'string' ? m.content : (m.text || '')}`)
                    .join('\n');

                await streamToCard({
                    cardId: newId,
                    messages: [{
                        role: 'user',
                        content: `[Previous Context]\n${sourceContext}\n\n[Focus Topic]\n${cleanChunk}\n\nBased on the context, please provide a deeper explanation, analysis, or additional details about this specific point.`
                    }],
                    config: activeConfig,
                    model: chatModel,
                    updateCardContent,
                    setCardGenerating
                });
            })();
        });
    };

    const handleDirectedSprout = async (sourceId, instruction) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source || !instruction) return;

        debugLog.ai(`Directed sprout for card: ${sourceId}`, { instruction });

        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const chatModel = state.getRoleModel('chat');

        try {
            const { generateDirectedCards } = await import('../services/llm');
            const contents = await generateDirectedCards(
                (source.data.messages || []).slice(-6),
                instruction,
                activeConfig,
                chatModel
            );

            if (!contents || contents.length === 0) {
                console.warn('[DirectedSprout] No content generated by AI');
                return;
            }

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
                        model: chatModel,
                        providerId: activeConfig.id
                    });

                    const sourceContext = (source.data.messages || []).slice(-4)
                        .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${typeof m.content === 'string' ? m.content : (m.text || '')}`)
                        .join('\n');

                    await streamToCard({
                        cardId: newId,
                        messages: [{
                            role: 'user',
                            content: `[Previous Context]\n${sourceContext}\n\n[Topic/Instruction]\n${content}\n\nBased on this topic, please elaborate or fulfill the implied request.`
                        }],
                        config: activeConfig,
                        model: chatModel,
                        updateCardContent,
                        setCardGenerating
                    });
                })();
            });

        } catch (e) {
            debugLog.error('Directed sprout failed', e);
        }
    };

    return { handleExpandTopics, handleSprout, handleQuickSprout, handleContinueTopic, handleBranch, handleDirectedSprout };
}
