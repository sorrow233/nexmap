import { getActiveConfig, imageGeneration, streamChatCompletion } from '../services/llm';
import { useStore } from '../store/useStore';
import { saveBoard, saveImageToIDB } from '../services/storage';
import { useParams } from 'react-router-dom';

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

    const createCardWithText = async (text, boardId, images = [], position = null) => {
        if (!text.trim() && images.length === 0) return;
        const activeConfig = getActiveConfig();
        try {
            const newId = await createAICard({
                text,
                x: position ? position.x : Math.max(0, (window.innerWidth / 2 - offset.x) / scale - 160),
                y: position ? position.y : Math.max(0, (window.innerHeight / 2 - offset.y) / scale - 100),
                images,
                model: activeConfig.model,
                providerId: activeConfig.id
            });

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
                    { type: 'text', text },
                    ...imageParts
                ];
            } else {
                messageContent = text;
            }

            await streamChatCompletion(
                [{ role: 'user', content: messageContent }],
                (chunk) => updateCardContent(newId, chunk),
                activeConfig.model,
                { providerId: activeConfig.id }
            );
        } catch (e) { console.error(e); } finally { setCardGenerating(null, false); }
    };

    const handleCreateCard = async (text, images = [], position = null) => {
        if (!text.trim() && images.length === 0) return;
        const activeConfig = getActiveConfig();

        // 1. Drawing command (Bypass batch logic)
        if (text.startsWith('/draw ') || text.startsWith('/image ')) {
            const promptText = text.replace(/^\/(draw|image)\s+/, '');
            const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            setCards(prev => [...prev, {
                id: newId, type: 'image_gen',
                x: (window.innerWidth / 2 - offset.x) / scale - 160 + (Math.random() * 40 - 20),
                y: (window.innerHeight / 2 - offset.y) / scale - 100 + (Math.random() * 40 - 20),
                data: { prompt: promptText, loading: true, title: `Generating: ${promptText.substring(0, 20)}...` }
            }]);
            try {
                const imageUrl = await imageGeneration(promptText);
                setCards(prev => prev.map(c => c.id === newId ? { ...c, data: { ...c.data, imageUrl, loading: false, title: promptText.substring(0, 30) } } : c));
            } catch (e) {
                console.error(e);
                setCards(prev => prev.map(c => c.id === newId ? { ...c, data: { ...c.data, error: e.message, loading: false, title: 'Failed' } } : c));
            }
            return;
        }

        // 2. Batch Chat Dispatch (New Logic)
        // If we have selected cards that are chat-capable, send the message to them instead of creating a new card.
        const targetCards = cards.filter(c => selectedIds.indexOf(c.id) !== -1 && c.data && Array.isArray(c.data.messages));

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
                    const imageId = `batch_img_${Date.now()}_${idx}`;
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

            // Trigger AI for each card
            targetCards.forEach(async (card) => {
                try {
                    // Construct history for this specific card
                    // We need to fetch the LATEST card state because setCards is async/batched
                    // But we can just use the card object from the filter + our new messages
                    // Actually, handleChatGenerate in store uses `streamChatCompletion` and expects `messages`.
                    // But wait, `handleChatGenerate` in store takes `(cardId, messages, onToken)`.
                    // It does NOT automatically fetch history from the store state for the *prompt*, 
                    // it relies on the `messages` argument we pass it.
                    // So we must pass [ ...oldMessages, userMsg ].

                    const history = [...card.data.messages, userMsg];

                    // We also need to handle context from neighbors if we want to be fancy, 
                    // but `handleChatGenerate` inside `useStore` acts as a wrapper that *can* doing context walking 
                    // if we use it, OR we can use it directly?
                    // Let's look at `useStore.js` `handleChatGenerate` implementation again.
                    // It takes `(cardId, messages, onToken)`. 
                    // Inside it: `const fullMessages = [...contextMessages, ...messages];`
                    // So it DOES adds context. That is perfect.
                    // So we just pass the NEW message(s) we want to complete on? 
                    // No, `handleChatGenerate` implementation shows: `const fullMessages = [...contextMessages, ...messages];`
                    // It appends `messages` (arg) to `contextMessages`. 
                    // If `messages` arg contains the WHOLE history, then we are duplicating context?
                    // Wait, `handleChatGenerate` says: `const visited = getConnectedGraph...`
                    // Then `await streamChatCompletion(fullMessages, ...)`
                    // If we pass the ENTIRE history as `messages`, it will be `[...context, ...entire_history]`.
                    // This is correct.

                    await handleChatGenerate(card.id, history, (chunk) => {
                        updateCardContent(card.id, chunk);
                    });

                } catch (e) {
                    console.error(`Batch chat failed for card ${card.id}`, e);
                    updateCardContent(card.id, `\n\n[System Error: ${e.message}]`);
                }
            });

            return; // STOP here, do not create a new card
        }

        // 3. Intelligent positioning (Existing fallback logic)
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

        const targetImages = [...images];
        // Ensure unique ID even for rapid sequential calls
        const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            await createAICard({
                id: newId,
                text,
                x: Math.max(0, targetX),
                y: Math.max(0, targetY),
                images: targetImages,
                contextPrefix,
                autoConnections: selectedIds.map(sid => ({ from: sid, to: newId })),
                model: activeConfig.model,
                providerId: activeConfig.id
            });

            let messageContent;
            if (targetImages.length > 0) {
                const imageParts = targetImages.map(img => ({
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
                await streamChatCompletion(
                    [{ role: 'user', content: messageContent }],
                    (chunk) => updateCardContent(newId, chunk),
                    activeConfig.model,
                    { providerId: activeConfig.id }
                );
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
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
        const activeConfig = getActiveConfig();

        source.data.marks.map(async (mark, index) => {
            try {
                const newY = source.y + (index * 320) - ((source.data.marks.length * 320) / 2) + 150;
                const newId = await createAICard({
                    text: mark,
                    x: source.x + 400,
                    y: newY,
                    autoConnections: [{ from: sourceId, to: `${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}` }],
                    model: activeConfig.model,
                    providerId: activeConfig.id
                });

                try {
                    await streamChatCompletion(
                        [{ role: 'user', content: mark }],
                        (chunk) => updateCardContent(newId, chunk),
                        activeConfig.model,
                        { providerId: activeConfig.id }
                    );
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
        const activeConfig = getActiveConfig();

        const CARD_HEIGHT = 400;
        const totalHeight = topics.length * CARD_HEIGHT;
        const startY = source.y - (totalHeight / 2) + (CARD_HEIGHT / 2);

        // We don't use Promise.all here because we want to fire and forget into the queue
        topics.forEach(async (question, index) => {
            try {
                const newY = startY + (index * CARD_HEIGHT);
                const newId = (Date.now() + index).toString();

                await createAICard({
                    id: newId,
                    text: question,
                    x: source.x + 450,
                    y: newY,
                    autoConnections: [{ from: sourceId, to: newId }],
                    model: activeConfig.model,
                    providerId: activeConfig.id
                });

                try {
                    await streamChatCompletion(
                        [{
                            role: 'user',
                            content: `[System: You are an expert brainstorming partner. Be direct, conversational, and avoid AI-isms. Do not use phrases like "Here are some ideas" or bullet points unless necessary. Write like a knowledgeable human.]\n\n${question}`
                        }],
                        (chunk) => updateCardContent(newId, chunk),
                        activeConfig.model,
                        { providerId: activeConfig.id }
                    );
                } catch (innerError) {
                    console.error("Sprout generation failed", innerError);
                    updateCardContent(newId, `\n\n[System Error: ${innerError.message || 'Generation failed'}]`);
                } finally {
                    setCardGenerating(newId, false);
                }
            } catch (e) {
                console.error("Sprout creation failed", e);
            }
        });
    };

    return {
        createCardWithText,
        handleCreateCard,
        handleCreateNote,
        handleExpandTopics,
        handleSprout
    };
}
