import { useStore } from '../store/useStore';
import { saveBoard, saveImageToIDB } from '../services/storage';
import { useParams } from 'react-router-dom';
import { uuid } from '../utils/uuid';
import { createPerformanceMonitor } from '../utils/performanceMonitor';
import { aiManager, PRIORITY } from '../services/ai/AIManager';
import { findOptimalPosition } from '../utils/geometry';
import { useAISprouting } from './useAISprouting';

export function useCardCreator() {
    const { id: currentBoardId } = useParams();
    const {
        cards,
        setCards,
        offset,
        scale,
        selectedIds,
        createAICard,
        updateCardContent,
        updateCard,
        setCardGenerating,
        addCard
    } = useStore();

    const { handleExpandTopics, handleSprout } = useAISprouting();

    /**
     * Internal helper for AI generation
     */
    const _generateAICard = async (text, x, y, images = [], contextPrefix = "") => {
        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const chatModel = state.getRoleModel('chat');
        const newId = uuid();

        try {
            await createAICard({
                id: newId,
                text,
                x, y,
                images,
                contextPrefix,
                autoConnections: selectedIds.map(sid => ({ from: sid, to: newId })),
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
                            firstToken = false;
                        }
                        perfMonitor.onChunk(chunk);
                        updateCardContent(newId, chunk);
                    }
                });

                perfMonitor.onComplete();
            } catch (innerError) {
                console.error("Streaming failed for card", newId, innerError);
                updateCardContent(newId, `\n\n[System Error: ${innerError.message || 'Generation failed'}]`);
            } finally {
                setCardGenerating(newId, false);
            }
        } catch (e) {
            console.error(e);
            setCardGenerating(newId, false);
        }
        return newId;
    };

    /**
     * Batch chat with selected cards
     */
    const handleBatchChat = async (text, images = []) => {
        if (!text.trim() && images.length === 0) return;

        const targetCards = cards.filter(c => selectedIds.indexOf(c.id) !== -1 && c.data && Array.isArray(c.data.messages));
        if (targetCards.length === 0) return false;

        const { handleChatGenerate } = useStore.getState();

        // Prepare context
        let userContentParts = [];
        if (text.trim()) userContentParts.push({ type: 'text', text });

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

        const assistantMsg = { role: 'assistant', content: '' };

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
                await handleChatGenerate(card.id, history, (chunk) => updateCardContent(card.id, chunk));
            } catch (e) {
                console.error(`Batch chat failed for card ${card.id}`, e);
                updateCardContent(card.id, `\n\n[System Error: ${e.message}]`);
            }
        }));
        return true;
    };

    /**
     * General purpose card creation (Text/AI/Image)
     */
    const handleCreateCard = async (text, images = [], position = null) => {
        if (!text.trim() && images.length === 0) return;

        // 1. Image Generation Command Detection
        if (text.startsWith('/draw ') || text.startsWith('/image ')) {
            const promptText = text.replace(/^\/(draw|image)\s+/, '');
            const newId = uuid();
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

                setCards(prev => prev.map(c => c.id === newId ? {
                    ...c,
                    data: { ...c.data, imageUrl, loading: false, title: promptText.substring(0, 30) }
                } : c));
                return;
            } catch (e) {
                console.error(e);
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

        // 3. Context Construction
        let contextPrefix = "";
        const contextCards = cards.filter(c => selectedIds.indexOf(c.id) !== -1);
        if (contextCards.length > 0) {
            contextPrefix = `[System Context: You are referencing multiple linked cards. IMPORTANT: When you want to refer to a specific card's content, ALWAYS use its ID in brackets like [cd14af...]. The system will automatically convert these IDs into clickable titles for the user. Do NOT write the titles yourself in the reference, just the ID.]\n\n${contextCards.map(c => `- Card "${c.data.title}" -> ID: [${c.id}]`).join('\n')}\n\n---\n\n`;
        }

        await _generateAICard(text, targetX, targetY, images, contextPrefix);
    };

    /**
     * Neural Notepad (Sticky Note) handling
     */
    const handleCreateNote = (text = '', isMaster = false) => {
        const safeText = (typeof text === 'string' ? text : '').trim();
        if (!safeText && isMaster) return;

        const existingNote = cards.find(c => c.type === 'note');

        if (existingNote) {
            const currentContent = existingNote.data.content || '';
            const lines = currentContent.split('\n').filter(l => l.trim());
            let nextNum = 1;

            if (lines.length > 0) {
                const numbers = lines
                    .map(line => {
                        const match = line.match(/^(\d+)\./);
                        return match ? parseInt(match[1], 10) : null;
                    })
                    .filter(n => n !== null);
                if (numbers.length > 0) nextNum = Math.max(...numbers) + 1;
            }

            const nextNumberStr = String(nextNum).padStart(2, '0');
            const newEntry = `${nextNumberStr}. ${safeText}`;
            const separator = currentContent.trim() ? '\n\n' : '';
            const updatedContent = currentContent + separator + newEntry;

            updateCard(existingNote.id, {
                ...existingNote.data,
                content: updatedContent,
                isNotepad: true
            });
        } else {
            addCard({
                id: uuid(),
                type: 'note',
                x: Math.max(0, (window.innerWidth / 2 - offset.x) / scale - 160),
                y: Math.max(0, (window.innerHeight / 2 - offset.y) / scale - 250),
                data: {
                    content: `01. ${safeText}`,
                    color: 'yellow',
                    isNotepad: true,
                    title: 'Neural Notepad'
                }
            });
        }

        // Trigger persistence
        if (currentBoardId) {
            setTimeout(() => {
                const latestState = useStore.getState();
                saveBoard(currentBoardId, {
                    cards: latestState.cards,
                    connections: latestState.connections
                });
            }, 50);
        }
    };

    return {
        handleCreateCard,
        handleCreateNote,
        handleExpandTopics,
        handleBatchChat,
        handleSprout
    };
}
