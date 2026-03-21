import { useStore } from '../../store/useStore';

export function createBoardChatHandlers({
    isReadOnly,
    currentBoardId,
    cards,
    offset,
    scale,
    navigate,
    quickPrompt,
    setQuickPrompt,
    tempInstructions,
    setTempInstructions,
    toast,
    cardCreator,
    handleChatGenerate,
    updateCardFull,
    updateCardContent,
    getConnectedCards,
    setSelectedIds,
    handleAgentPlanSubmit,
    isAgentRunning,
    setIsAgentRunning,
    customSproutPrompt,
    setCustomSproutPrompt,
    handleDirectedSprout
}) {
    const handleCanvasDoubleClick = (event) => {
        if (isReadOnly) return;
        setQuickPrompt({
            isOpen: true,
            x: event.screenX,
            y: event.screenY,
            canvasX: event.canvasX,
            canvasY: event.canvasY
        });
    };

    const handleQuickPromptSubmit = (text) => {
        if (isReadOnly || !quickPrompt.isOpen) return;
        cardCreator.handleCreateCard(text, [], { x: quickPrompt.canvasX, y: quickPrompt.canvasY });
    };

    const handleFullScreen = (cardId) => {
        navigate(`/board/${currentBoardId}/note/${cardId}`);
    };

    const handleChatModalGenerate = async (cardId, text, images = []) => {
        if (isReadOnly) return;
        const freshCards = useStore.getState().cards;
        const card = freshCards.find(c => c.id === cardId);
        if (!card) return;

        let finalText = text;
        if (tempInstructions.length > 0) {
            const contextStr = tempInstructions.map(item => `[System Instruction: ${item.content || item.text}]`).join('\n');
            finalText = `${contextStr}\n\n${text}`;
            setTempInstructions([]);
        }

        const userContent = images.length > 0
            ? [
                { type: 'text', text: finalText },
                ...images.map(img => ({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: img.mimeType,
                        data: img.base64
                    }
                }))
            ]
            : finalText;

        const userMsg = { role: 'user', content: userContent };
        const assistantMsgId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const assistantMsg = { role: 'assistant', content: '', id: assistantMsgId };

        updateCardFull(cardId, (currentData) => ({
            ...currentData,
            messages: [...(currentData.messages || []), userMsg, assistantMsg]
        }));

        const history = [...(card.data.messages || []), userMsg];

        try {
            await handleChatGenerate(cardId, history, (chunk) => {
                updateCardContent(cardId, chunk, assistantMsgId);
            });
        } catch (error) {
            console.error('[DEBUG handleChatModalGenerate] Generation failed with error:', error);
            updateCardContent(cardId, `\n\n[System Error: ${error.message || 'Unknown error in UI layer'}]`, assistantMsgId);
        }
    };

    const handleSelectConnected = (startId) => {
        const connectedIds = getConnectedCards(startId);
        const uniqueIds = Array.from(new Set([...connectedIds, startId]));
        setSelectedIds(uniqueIds);
    };

    const handlePromptDropOnChat = (prompt) => {
        if (isReadOnly) return;
        setTempInstructions(prev => [...prev, prompt]);
        toast.success(`Added instruction: ${prompt.text.substring(0, 20)}...`);
    };

    const handleChatSubmitWithInstructions = async (text, images) => {
        if (isReadOnly) return;
        let finalText = text;
        if (tempInstructions.length > 0) {
            const contextStr = tempInstructions.map(item => `[System Instruction: ${item.text}]`).join('\n');
            finalText = `${contextStr}\n\n${text}`;
        }
        await cardCreator.handleCreateCard(finalText, images);
        setTempInstructions([]);
    };

    const handleAgentSubmit = async (text, images) => {
        if (isReadOnly || isAgentRunning) return;
        let finalText = text;
        if (tempInstructions.length > 0) {
            const contextStr = tempInstructions.map(item => `[System Instruction: ${item.text}]`).join('\n');
            finalText = `${contextStr}\n\n${text}`;
        }
        setIsAgentRunning(true);
        toast.info('Agent mode is planning your cards...');
        try {
            const result = await handleAgentPlanSubmit(finalText, images);
            const successCount = result?.success || 0;
            const totalCount = result?.total || 0;
            if (totalCount > 0) {
                toast.success(`Agent completed: ${successCount}/${totalCount} cards generated`);
            } else {
                toast.warning('Agent mode finished, but no cards were generated.');
            }
        } catch (error) {
            toast.error(`Agent mode failed: ${error?.message || 'Unknown error'}`);
        } finally {
            setTempInstructions([]);
            setIsAgentRunning(false);
        }
    };

    const handlePromptDropOnCanvas = (prompt, x, y) => {
        if (isReadOnly) return;
        cardCreator.handleCreateCard(prompt.text, [], { x, y });
    };

    const handlePromptDropOnCard = (cardId, prompt) => {
        if (isReadOnly) return;
        handleChatModalGenerate(cardId, prompt.text, []);
    };

    const handleCustomSprout = (sourceId) => {
        if (isReadOnly) return;
        const sourceCard = cards.find(c => c.id === sourceId);
        if (!sourceCard) return;

        let screenX = (sourceCard.x * scale) + offset.x + 350 * scale;
        let screenY = (sourceCard.y * scale) + offset.y;

        screenX = Math.max(10, Math.min(screenX, window.innerWidth - 340));
        screenY = Math.max(10, Math.min(screenY, window.innerHeight - 150));

        setCustomSproutPrompt({
            isOpen: true,
            sourceId,
            x: screenX,
            y: screenY
        });
    };

    const handleCustomSproutSubmit = (instruction) => {
        if (isReadOnly || !customSproutPrompt.isOpen || !customSproutPrompt.sourceId) return;

        handleDirectedSprout(customSproutPrompt.sourceId, instruction);
        setCustomSproutPrompt({ isOpen: false, sourceId: null, x: 0, y: 0 });
    };

    return {
        handleCanvasDoubleClick,
        handleQuickPromptSubmit,
        handleFullScreen,
        handleChatModalGenerate,
        handleSelectConnected,
        handlePromptDropOnChat,
        handleChatSubmitWithInstructions,
        handleAgentSubmit,
        handlePromptDropOnCanvas,
        handlePromptDropOnCard,
        handleCustomSprout,
        handleCustomSproutSubmit
    };
}
