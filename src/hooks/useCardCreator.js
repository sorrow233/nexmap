import { getActiveConfig, imageGeneration, streamChatCompletion } from '../services/llm';
import { useStore } from '../store/useStore';

export function useCardCreator() {
    const {
        cards,
        setCards,
        offset,
        scale,
        selectedIds,
        createAICard,
        updateCardContent,
        setCardGenerating,
        addCard
    } = useStore();

    const createCardWithText = async (text, boardId, images = []) => {
        if (!text.trim() && images.length === 0) return;
        const activeConfig = getActiveConfig();
        try {
            const newId = await createAICard({
                text,
                x: Math.max(0, (window.innerWidth / 2 - offset.x) / scale - 160),
                y: Math.max(0, (window.innerHeight / 2 - offset.y) / scale - 100),
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

    const handleCreateCard = async (text, images = []) => {
        if (!text.trim() && images.length === 0) return;
        const activeConfig = getActiveConfig();

        // 1. Drawing command
        if (text.startsWith('/draw ') || text.startsWith('/image ')) {
            const promptText = text.replace(/^\/(draw|image)\s+/, '');
            const newId = Date.now().toString();
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

        // 2. Intelligent positioning
        let targetX, targetY;
        const contextCards = cards.filter(c => selectedIds.indexOf(c.id) !== -1);

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

        // 3. Context Construction
        let contextPrefix = "";
        if (contextCards.length > 0) {
            contextPrefix = `[System: Context]\n\n${contextCards.map(c => `Card [${c.id}]: ${c.data.title}`).join('\n')}\n\n---\n\n`;
        }

        const targetImages = [...images];
        const newId = Date.now().toString();

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

            await streamChatCompletion(
                [{ role: 'user', content: messageContent }],
                (chunk) => updateCardContent(newId, chunk),
                activeConfig.model,
                { providerId: activeConfig.id }
            );
        } catch (e) {
            console.error(e);
        } finally {
            setCardGenerating(newId, false);
        }
    };

    const handleCreateNote = (text = '') => {
        addCard({
            id: Date.now().toString(), type: 'note',
            x: Math.max(0, (window.innerWidth / 2 - offset.x) / scale - 80),
            y: Math.max(0, (window.innerHeight / 2 - offset.y) / scale - 80),
            data: { content: text || '', color: 'yellow' }
        });
    };

    const handleExpandTopics = async (sourceId) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source || !source.data.marks) return;
        const activeConfig = getActiveConfig();

        const promises = source.data.marks.map(async (mark, index) => {
            try {
                const newY = source.y + (index * 320) - ((source.data.marks.length * 320) / 2) + 150;
                const newId = await createAICard({
                    text: mark,
                    x: source.x + 400,
                    y: newY,
                    autoConnections: [{ from: sourceId, to: Date.now().toString() + index }],
                    model: activeConfig.model,
                    providerId: activeConfig.id
                });
                await streamChatCompletion([{ role: 'user', content: mark }], (chunk) => updateCardContent(newId, chunk), activeConfig.model, { providerId: activeConfig.id });
            } catch (e) { console.error(e); }
        });

        await Promise.all(promises);
    };

    const handleSprout = async (sourceId, topics) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source || !topics.length) return;
        const activeConfig = getActiveConfig();

        const CARD_HEIGHT = 400;
        const totalHeight = topics.length * CARD_HEIGHT;
        const startY = source.y - (totalHeight / 2) + (CARD_HEIGHT / 2);

        const promises = topics.map(async (question, index) => {
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

                await streamChatCompletion(
                    [{ role: 'user', content: question }],
                    (chunk) => updateCardContent(newId, chunk),
                    activeConfig.model,
                    { providerId: activeConfig.id }
                );
            } catch (e) {
                console.error("Sprout creation failed", e);
            }
        });

        await Promise.all(promises);
    };

    return {
        createCardWithText,
        handleCreateCard,
        handleCreateNote,
        handleExpandTopics,
        handleSprout
    };
}
