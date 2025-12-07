import { aiManager, PRIORITY } from './AIManager';
import { debugLog } from '../../utils/debugLogger';

/**
 * Helper to stream AI response into a card.
 * Handles task request, progress updates, error handling, and completion state.
 * 
 * @param {Object} params
 * @param {string} params.cardId - Target card ID
 * @param {Array} params.messages - Chat messages for the LLM
 * @param {Object} params.config - AI Provider config
 * @param {string} params.model - Model ID
 * @param {Function} params.updateCardContent - Store action to update content
 * @param {Function} params.setCardGenerating - Store action to set generating flag
 * @param {string} [params.taskType='chat'] - Task type for AIManager
 */
export async function streamToCard({
    cardId,
    messages,
    config,
    model,
    updateCardContent,
    setCardGenerating,
    taskType = 'chat'
}) {
    if (!cardId || !messages || !config) {
        console.error('[streamToCard] Missing required parameters');
        return;
    }

    try {
        await aiManager.requestTask({
            type: taskType,
            priority: PRIORITY.HIGH,
            payload: {
                messages,
                model,
                config
            },
            tags: [`card:${cardId}`],
            onProgress: (chunk) => updateCardContent(cardId, chunk)
        });
        debugLog.ai(`Stream complete for card: ${cardId}`);
    } catch (innerError) {
        debugLog.error(`Stream failed for card ${cardId}`, innerError);
        const errMsg = innerError.message || 'Generation failed';
        const userMessage = errMsg.toLowerCase().includes('upstream') || errMsg.toLowerCase().includes('unavailable')
            ? `\n\n⚠️ **AI服务暂时不可用**\n服务器繁忙，请稍后重试。`
            : `\n\n⚠️ **生成失败**: ${errMsg}`;
        updateCardContent(cardId, userMessage);
    } finally {
        setCardGenerating(cardId, false);
    }
}
