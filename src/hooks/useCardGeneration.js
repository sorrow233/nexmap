import { useStore } from '../store/useStore';
import { uuid } from '../utils/uuid';
import { createPerformanceMonitor } from '../utils/performanceMonitor';
import { aiManager, PRIORITY } from '../services/ai/AIManager';
import { saveImageToIDB } from '../services/storage';
import { debugLog } from '../utils/debugLogger';

export function useCardGeneration() {
    const {
        setCards,
        createAICard,
        updateCardContent,
        setCardGenerating,
        selectedIds,
        cards
    } = useStore();

    /**
     * Internal helper for AI generation
     */
    const _generateAICard = async (text, x, y, images = [], contextPrefix = "") => {
        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const chatModel = state.getRoleModel('chat');
        const newId = uuid();
        const currentSelectedIds = state.selectedIds || [];

        debugLog.ai('Starting AI card generation', { text, x, y, model: chatModel });

        try {
            await createAICard({
                id: newId,
                text,
                x, y,
                images,
                contextPrefix,
                autoConnections: currentSelectedIds.map(sid => ({ from: sid, to: newId })),
                model: chatModel,
                providerId: activeConfig.id
            });

            // Construct content for AI
            let messageContent;
            if (images.length > 0) {
                const imageParts = images.map(img => ({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: img.mimeType,
                        data: img.base64
                    }
                }));
                messageContent = [
                    { type: 'text', text: contextPrefix + text },
                    ...imageParts
                ];
            } else {
                messageContent = contextPrefix + text;
            }

            // Queue the streaming task
            try {
                const perfMonitor = createPerformanceMonitor({
                    cardId: newId,
                    model: chatModel,
                    providerId: activeConfig.id,
                    messages: [{ role: 'user', content: messageContent }],
                    stream: true
                });

                debugLog.ai(`Queueing AI task for card ${newId}`);

                let firstToken = true;
                await aiManager.requestTask({
                    type: 'chat',
                    priority: PRIORITY.HIGH,
                    payload: {
                        messages: [{ role: 'user', content: messageContent }],
                        model: chatModel,
                        config: activeConfig
                    },
                    tags: [`card:${newId}`],
                    onProgress: (chunk) => {
                        if (firstToken) {
                            perfMonitor.onFirstToken();
                            debugLog.ai(`Received first token for card ${newId}`);
                            firstToken = false;
                        }
                        perfMonitor.onChunk(chunk);

                        // Find the assistant message ID to ensure isolated buffering
                        const freshCard = useStore.getState().cards.find(c => c.id === newId);
                        const assistantMsg = freshCard?.data?.messages?.slice().reverse().find(m => m.role === 'assistant');
                        updateCardContent(newId, chunk, assistantMsg?.id);
                    }
                });

                debugLog.ai(`AI task completed for card ${newId}`);
                perfMonitor.onComplete();
            } catch (innerError) {
                debugLog.error(`Streaming failed for card ${newId}`, innerError);
                const errMsg = innerError.message || 'Generation failed';
                const userMessage = errMsg.toLowerCase().includes('upstream') || errMsg.toLowerCase().includes('unavailable')
                    ? `\n\n⚠️ **AI服务暂时不可用**\n服务器繁忙，请稍后重试。`
                    : `\n\n⚠️ **生成失败**: ${errMsg}`;
                updateCardContent(newId, userMessage);
            } finally {
                setCardGenerating(newId, false);
            }
        } catch (e) {
            debugLog.error(`Card generation failed for ${newId}`, e);
            setCardGenerating(newId, false);
        }
        return newId;
    };

    /**
     * Batch chat with selected cards
     */
    const handleBatchChat = async (text, images = []) => {
        // Robustness Check: Ensure text is a string
        const safeText = (typeof text === 'string' ? text : (text?.toString() || '')).trim();
        if (!safeText && (!images || images.length === 0)) return;

        const targetCards = cards.filter(c => selectedIds.indexOf(c.id) !== -1 && c.data && Array.isArray(c.data.messages));
        if (targetCards.length === 0) return false;

        debugLog.ai('Starting batch chat', { text: safeText, targetCount: targetCards.length });

        const { handleChatGenerate } = useStore.getState();

        // Prepare context
        let userContentParts = [];
        if (safeText) userContentParts.push({ type: 'text', text: safeText });

        if (images.length > 0) {
            const processedImages = await Promise.all(images.map(async (img, idx) => {
                const imageId = `batch_img_${uuid()}_${idx}`;
                await saveImageToIDB(imageId, img.base64);
                return {
                    type: 'image',
                    source: { type: 'idb', id: imageId, media_type: img.mimeType }
                };
            }));
            userContentParts = [...userContentParts, ...processedImages];
        }

        const userMsg = {
            role: 'user',
            content: userContentParts.length === 1 && userContentParts[0].type === 'text'
                ? userContentParts[0].text
                : userContentParts
        };

        const assistantId = uuid();
        const assistantMsg = { id: assistantId, role: 'assistant', content: '' };

        // Optimistic UI Update
        setCards(prev => prev.map(c => {
            if (selectedIds.indexOf(c.id) !== -1 && c.data && Array.isArray(c.data.messages)) {
                return {
                    ...c,
                    data: { ...c.data, messages: [...c.data.messages, userMsg, assistantMsg] }
                };
            }
            return c;
        }));

        // Execute concurrent AI requests
        await Promise.all(targetCards.map(async (card) => {
            try {
                const history = [...card.data.messages, userMsg];
                // Find the specific assistant message ID we just created for this card in the optimistic update
                const freshCard = useStore.getState().cards.find(c => c.id === card.id);
                const assistantMsg = freshCard?.data?.messages?.slice().reverse().find(m => m.role === 'assistant');
                const messageId = assistantMsg?.id;

                await handleChatGenerate(card.id, history, (chunk, msgId) => updateCardContent(card.id, chunk, msgId || messageId));
                debugLog.ai(`Batch response complete for card ${card.id}`);
            } catch (e) {
                debugLog.error(`Batch chat failed for card ${card.id}`, e);
                const errMsg = e.message || 'Generation failed';
                const userMessage = errMsg.toLowerCase().includes('upstream') || errMsg.toLowerCase().includes('unavailable')
                    ? `\n\n⚠️ **AI服务暂时不可用**\n服务器繁忙，请稍后重试。`
                    : `\n\n⚠️ **生成失败**: ${errMsg}`;
                updateCardContent(card.id, userMessage);
            }
        }));
        return true;
    };

    return {
        _generateAICard,
        handleBatchChat
    };
}
