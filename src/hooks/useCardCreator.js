import { getActiveConfig, imageGeneration } from '../services/llm';
import { useStore } from '../store/useStore';
import { saveBoard, saveImageToIDB } from '../services/storage';
import { useParams } from 'react-router-dom';
import { uuid } from '../utils/uuid';
import { createPerformanceMonitor } from '../utils/performanceMonitor';
import { aiManager, PRIORITY } from '../services/ai/AIManager';

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

    // Internal helper for AI generation
    const _generateAICard = async (text, x, y, images = [], contextPrefix = "") => {
        console.log('[DEBUG _generateAICard] Starting generation for text:', text.substring(0, 20));

        // REFACTOR: Get config and roles from store
        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const chatModel = state.getRoleModel('chat'); // Respects user role setting

        console.log('[DEBUG _generateAICard] Active config:', activeConfig, 'Model:', chatModel);
        const newId = uuid();

        try {
            await createAICard({
                id: newId,
                text,
                x, y,
                images,
                contextPrefix,
                autoConnections: selectedIds.map(sid => ({ from: sid, to: newId })),
                model: chatModel, // Use role model
                providerId: activeConfig.id
            });
            console.log('[DEBUG _generateAICard] Card created in store:', newId);

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
                console.log('[DEBUG _generateAICard] Starting streamChatCompletion for:', newId);

                // Create performance monitor
                const perfMonitor = createPerformanceMonitor({
                    cardId: newId,
                    model: chatModel,
                    providerId: activeConfig.id,
                    messages: [{ role: 'user', content: messageContent }],
                    temperature: undefined,
                    stream: true
                });

                let firstToken = true;
                // Use AIManager for centralized scheduling
                // AWAIT the promise returned by requestTask!
                await aiManager.requestTask({
                    type: 'chat',
                    priority: PRIORITY.HIGH, // Card creation is high priority
                    payload: {
                        messages: [{ role: 'user', content: messageContent }],
                        model: chatModel,
                        temperature: undefined,
                        config: activeConfig // Pass config
                    },
                    tags: [`card:${newId}`],
                    onProgress: (chunk) => {
                        if (firstToken) {
                            perfMonitor.onFirstToken();
                            firstToken = false;
                        }
                        perfMonitor.onChunk(chunk);
                        console.log('[DEBUG _generateAICard] Received chunk for:', newId);
                        updateCardContent(newId, chunk);
                    }
                });

                perfMonitor.onComplete();
                console.log('[DEBUG _generateAICard] Streaming completed for:', newId);
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

    const createCardWithText = async (text, boardId, images = [], position = null) => {
        if (!text.trim() && images.length === 0) return;

        let targetX, targetY;
        if (position) {
            targetX = position.x;
            targetY = position.y;
        } else {
            targetX = Math.max(0, (window.innerWidth / 2 - offset.x) / scale - 160);
            targetY = Math.max(0, (window.innerHeight / 2 - offset.y) / scale - 100);
        }

        await _generateAICard(text, targetX, targetY, images);
    };

    const handleBatchChat = async (text, images = []) => {
        console.log('[DEBUG handleBatchChat] Called with:', { text, imagesCount: images.length, selectedIds });
        if (!text.trim() && images.length === 0) return;

        // If we have selected cards that are chat-capable, send the message to them instead of creating a new card.
        const targetCards = cards.filter(c => selectedIds.indexOf(c.id) !== -1 && c.data && Array.isArray(c.data.messages));
        console.log('[DEBUG handleBatchChat] Target cards:', targetCards.length);

        if (targetCards.length > 0) {
            // Needed to access handleChatGenerate from store
            const { handleChatGenerate } = useStore.getState();

            // Prepare the new user message
            let userContentParts = [];
            if (text.trim()) {
                userContentParts.push({ type: 'text', text });
            }

            if (images.length > 0) {
                // Save images to IDB once and reuse the reference for all cards
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

            if (userContentParts.length === 0) return;

            const userMsg = {
                role: 'user',
                content: userContentParts.length === 1 && userContentParts[0].type === 'text'
                    ? userContentParts[0].text
                    : userContentParts
            };

            const assistantMsg = { role: 'assistant', content: '' };

            // Optimistic UI Update: Append messages to ALL targets immediately
            setCards(prev => prev.map(c => {
                if (selectedIds.indexOf(c.id) !== -1 && c.data && Array.isArray(c.data.messages)) {
                    return {
                        ...c,
                        data: {
                            ...c.data,
                            messages: [...c.data.messages, userMsg, assistantMsg]
                        }
                    };
                }
                return c;
            }));

            // Trigger AI for each card concurrently with proper error handling
            await Promise.all(targetCards.map(async (card) => {
                try {
                    console.log('[DEBUG handleBatchChat] Starting AI for card:', card.id);
                    const history = [...card.data.messages, userMsg];
                    // handleChatGenerate adds context internally
                    await handleChatGenerate(card.id, history, (chunk) => {
                        console.log('[DEBUG handleBatchChat] Received chunk for card:', card.id);
                        updateCardContent(card.id, chunk);
                    });
                } catch (e) {
                    console.error(`Batch chat failed for card ${card.id}`, e);
                    updateCardContent(card.id, `\n\n[System Error: ${e.message}]`);
                }
            }));
            console.log('[DEBUG handleBatchChat] Batch chat completed successfully');
            return true; // Indicate handled
        }
        console.log('[DEBUG handleBatchChat] No target cards, returning false');
        return false; // Not handled
    };

    const handleCreateCard = async (text, images = [], position = null) => {
        if (!text.trim() && images.length === 0) return;

        // 1. Drawing command (Bypass batch logic)
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
                // REFACTOR: Use store config for image generation
                const state = useStore.getState();
                const activeConfig = state.getActiveConfig();
                const imageModel = state.getRoleModel('image'); // Respects user role setting

                const imageUrl = await imageGeneration(promptText, activeConfig, imageModel);
                setCards(prev => prev.map(c => c.id === newId ? { ...c, data: { ...c.data, imageUrl, loading: false, title: promptText.substring(0, 30) } } : c));
            } catch (e) {
                console.error(e);
                setCards(prev => prev.map(c => c.id === newId ? { ...c, data: { ...c.data, error: e.message, loading: false, title: 'Failed' } } : c));
            }
        }

        // 2. Intelligent positioning (Existing fallback logic)
        let targetX, targetY;
        const contextCards = cards.filter(c => selectedIds.indexOf(c.id) !== -1);

        if (position) {
            // Use provided position directly
            targetX = position.x;
            targetY = position.y;
        } else {
            if (contextCards.length > 0) {
                const rightMostCard = contextCards.reduce((prev, current) => (prev.x > current.x) ? prev : current);
                const topMostY = Math.min(...contextCards.map(c => c.y));

                targetX = rightMostCard.x + 340;
                targetY = topMostY;

                let safetyCounter = 0;
                while (
                    cards.some(c =>
                        Math.abs(c.x - targetX) < 100 &&
                        Math.abs(c.y - targetY) < 100
                    ) && safetyCounter < 10
                ) {
                    targetY += 150;
                    targetX += 20;
                    safetyCounter++;
                }
            } else {
                targetX = (window.innerWidth / 2 - offset.x) / scale - 160 + (Math.random() * 40 - 20);
                targetY = (window.innerHeight / 2 - offset.y) / scale - 100 + (Math.random() * 40 - 20);
            }
        }

        // 4. Context Construction
        let contextPrefix = "";
        if (contextCards.length > 0) {
            contextPrefix = `[System: Context]\n\n${contextCards.map(c => `Card [${c.id}]: ${c.data.title}`).join('\n')}\n\n---\n\n`;
        }

        await _generateAICard(text, targetX, targetY, images, contextPrefix);
    };

    const handleCreateNote = (text = '', isMaster = false) => {
        const safeText = (typeof text === 'string' ? text : '').trim();
        if (!safeText && isMaster) return; // Don't append empty text to master

        // Find existing note - prioritize one marked as 'notepad' or just the first note
        const existingNote = cards.find(c => c.type === 'note');

        if (existingNote) {
            const currentContent = existingNote.data.content || '';

            // Strict parsing of "XX. " format
            const lines = currentContent.split('\n').filter(l => l.trim());
            let nextNum = 1;

            if (lines.length > 0) {
                // Look for the last line that matches our pattern
                const lastLine = lines[lines.length - 1];
                const match = lastLine.match(/^(\d+)\./);
                if (match) {
                    nextNum = parseInt(match[1], 10) + 1;
                } else {
                    nextNum = lines.length + 1;
                }
            }

            const nextNumberStr = String(nextNum).padStart(2, '0');
            const newEntry = `${nextNumberStr}. ${safeText}`;

            // Build updated content with proper spacing
            const separator = currentContent.trim() ? '\n\n' : '';
            const updatedContent = currentContent + separator + newEntry;

            updateCard(existingNote.id, {
                ...existingNote.data,
                content: updatedContent,
                isNotepad: true // Mark as notepad
            });
        } else {
            // Create the one and only note card
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

        // Trigger immediate persistence to avoid sync conflicts
        if (currentBoardId) {
            // We use a small timeout to let the store update settle
            setTimeout(() => {
                const latestState = useStore.getState();
                saveBoard(currentBoardId, {
                    cards: latestState.cards,
                    connections: latestState.connections
                });
            }, 50);
        }
    };

    const handleExpandTopics = async (sourceId) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source || !source.data.marks) return;

        // REFACTOR: Use store config
        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const chatModel = state.getRoleModel('chat'); // Respects user role setting

        source.data.marks.map(async (mark, index) => {
            try {
                const newY = source.y + (index * 320) - ((source.data.marks.length * 320) / 2) + 150;
                const generatedId = uuid();

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
                    // Use AIManager for ExpandTopics too
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
                } catch (innerError) {
                    console.error("Expand topic failed", innerError);
                    updateCardContent(newId, `\n\n[System Error: ${innerError.message || 'Generation failed'}]`);
                } finally {
                    setCardGenerating(newId, false);
                }
            } catch (e) {
                console.error(e);
            }
        });
    };

    const handleSprout = async (sourceId, topics) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source || !topics.length) return;

        // REFACTOR: Use store config
        const state = useStore.getState();
        const activeConfig = state.getActiveConfig();
        const chatModel = state.getRoleModel('chat'); // Respects user role setting

        const CARD_HEIGHT = 400;
        const totalHeight = topics.length * CARD_HEIGHT;
        const startY = source.y - (totalHeight / 2) + (CARD_HEIGHT / 2);

        // Fire and forget - no concurrency limit, all topics generate simultaneously
        topics.forEach((question, index) => {
            (async () => {
                try {
                    const newY = startY + (index * CARD_HEIGHT);
                    const newId = uuid();

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
                        // Use AIManager for Sprout
                        await aiManager.requestTask({
                            type: 'chat',
                            priority: PRIORITY.HIGH,
                            payload: {
                                messages: [{
                                    role: 'user',
                                    content: `[System: You are an expert brainstorming partner. Be direct, conversational, and avoid AI-isms. Do not use phrases like "Here are some ideas" or bullet points unless necessary. Write like a knowledgeable human.]\n\n${question}`
                                }],
                                model: chatModel,
                                config: activeConfig
                            },
                            tags: [`card:${newId}`],
                            onProgress: (chunk) => updateCardContent(newId, chunk)
                        });
                    } catch (innerError) {
                        console.error("Sprout generation failed", innerError);
                        updateCardContent(newId, `\n\n[System Error: ${innerError.message || 'Generation failed'}]`);
                    } finally {
                        setCardGenerating(newId, false);
                    }
                } catch (e) {
                    console.error("Sprout creation failed", e);
                }
            })();
        });
    };

    return {
        createCardWithText,
        handleCreateCard,
        handleCreateNote,
        handleExpandTopics,
        handleBatchChat,
        handleSprout
    };
}
