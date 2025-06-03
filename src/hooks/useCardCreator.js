import { useStore } from '../store/useStore';
import { useParams } from 'react-router-dom';
import { uuid } from '../utils/uuid';
import { aiManager, PRIORITY } from '../services/ai/AIManager';
import { findOptimalPosition } from '../utils/geometry';
import { useAISprouting } from './useAISprouting';
import { debugLog } from '../utils/debugLogger';
import { useCardGeneration } from './useCardGeneration';
import { useNeuralNotepad } from './useNeuralNotepad';

export function useCardCreator() {
    const { id: currentBoardId } = useParams();
    const {
        cards,
        setCards,
        offset,
        scale,
        selectedIds
    } = useStore();

    const { handleExpandTopics, handleSprout } = useAISprouting();
    const { _generateAICard, handleBatchChat } = useCardGeneration();
    const { handleCreateNote } = useNeuralNotepad();

    /**
     * General purpose card creation (Text/AI/Image)
     */
    const handleCreateCard = async (text, images = [], position = null) => {
        if (!text.trim() && images.length === 0) return;

        // 1. Image Generation Command Detection
        if (text.startsWith('/draw ') || text.startsWith('/image ')) {
            const promptText = text.replace(/^\/(draw|image)\s+/, '');
            const newId = uuid();
            debugLog.ai('Starting image generation', { prompt: promptText });

            setCards(prev => [...prev, {
                id: newId, type: 'image_gen',
                x: (window.innerWidth / 2 - offset.x) / scale - 160 + (Math.random() * 40 - 20),
                y: (window.innerHeight / 2 - offset.y) / scale - 100 + (Math.random() * 40 - 20),
                data: { prompt: promptText, loading: true, title: `Generating: ${promptText.substring(0, 20)}...` }
            }]);

            try {
                const state = useStore.getState();
                const activeConfig = state.getActiveConfig();
                const imageUrl = await aiManager.requestTask({
                    type: 'image',
                    priority: PRIORITY.HIGH,
                    payload: { prompt: promptText, config: activeConfig },
                    tags: [`card:${newId}`]
                });

                debugLog.ai(`Image generation success for ${newId}`, { imageUrl });

                setCards(prev => prev.map(c => c.id === newId ? {
                    ...c,
                    data: { ...c.data, imageUrl, loading: false, title: promptText.substring(0, 30) }
                } : c));
                return;
            } catch (e) {
                debugLog.error(`Image generation failed for ${newId}`, e);
                setCards(prev => prev.map(c => c.id === newId ? {
                    ...c,
                    data: { ...c.data, error: e.message, loading: false, title: 'Failed' }
                } : c));
                return;
            }
        }

        // 2. Position Calculation
        let targetX, targetY;
        if (position) {
            targetX = position.x;
            targetY = position.y;
        } else {
            const optimalPos = findOptimalPosition(cards, offset, scale, selectedIds);
            targetX = optimalPos.x;
            targetY = optimalPos.y;
        }

        // 3. Context Construction - Include actual card content for better AI understanding
        let contextPrefix = "";
        const contextCards = cards.filter(c => selectedIds.indexOf(c.id) !== -1);
        if (contextCards.length > 0) {
            contextPrefix = contextCards.map(c => {
                // Build context from card's conversation history
                const title = c.data?.title || 'Untitled';
                const messages = c.data?.messages || [];
                // Get last 3 messages for context (to avoid token overflow)
                const recentMessages = messages.slice(-3).map(m => {
                    const contentStr = typeof m.content === 'string'
                        ? m.content
                        : (Array.isArray(m.content)
                            ? m.content.map(p => p.type === 'text' ? p.text : '[Image]').join(' ')
                            : '');
                    // Truncate very long messages
                    const truncated = contentStr.length > 500 ? contentStr.substring(0, 500) + '...' : contentStr;
                    return `${m.role}: ${truncated}`;
                }).join('\n');
                return `--- Card: "${title}" ---\n${recentMessages}`;
            }).join('\n\n') + '\n\n---\n\nBased on the above context, please respond to:\n\n';
        }

        await _generateAICard(text, targetX, targetY, images, contextPrefix);
    };

    /**
     * Create a card with initial text/images - used by App.jsx when creating a board from homepage
     * This wraps handleCreateCard with simplified parameters for the homepage use case
     * Note: boardId is passed for logging/debugging but actual board context comes from useParams
     */
    const createCardWithText = async (text, images = []) => {
        if (!text?.trim() && images.length === 0) return;

        debugLog.ai('createCardWithText called', { text, currentBoardId, imageCount: images.length });

        // Use handleCreateCard which handles all the AI generation logic
        await handleCreateCard(text, images);
    };

    return {
        handleCreateCard,
        handleCreateNote: (text, isMaster) => handleCreateNote(text, isMaster, currentBoardId),
        handleExpandTopics,
        handleBatchChat,
        handleSprout,
        createCardWithText
    };
}
