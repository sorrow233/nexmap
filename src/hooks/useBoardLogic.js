import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useCardCreator } from '../hooks/useCardCreator';
import { useGlobalHotkeys } from '../hooks/useGlobalHotkeys';
import { saveBoard, saveBoardToCloud, saveViewportState } from '../services/storage';
import { debugLog } from '../utils/debugLogger';
import { useToast } from '../components/Toast';
// import { useThumbnailCapture } from '../hooks/useThumbnailCapture';
import { useAISprouting } from '../hooks/useAISprouting';
import { useLanguage } from '../contexts/LanguageContext';

export function useBoardLogic({ user, boardsList, onUpdateBoardTitle, onBack }) {
    const { id: currentBoardId, noteId } = useParams();
    const navigate = useNavigate();

    // Store Selectors
    const cards = useStore(state => state.cards);
    const connections = useStore(state => state.connections);
    const groups = useStore(state => state.groups);
    const selectedIds = useStore(state => state.selectedIds);
    const generatingCardIds = useStore(state => state.generatingCardIds);
    const expandedCardId = useStore(state => state.expandedCardId);
    const offset = useStore(state => state.offset);
    const scale = useStore(state => state.scale);
    const isBoardLoading = useStore(state => state.isBoardLoading);
    const favoritesLastUpdate = useStore(state => state.favoritesLastUpdate);
    const boardPrompts = useStore(state => state.boardPrompts);
    const isHydratingFromCloud = useStore(state => state.isHydratingFromCloud);

    // Store Actions
    const setExpandedCardId = useStore(state => state.setExpandedCardId);
    const updateCardFull = useStore(state => state.updateCardFull);
    const handleRegenerate = useStore(state => state.handleRegenerate);
    const handleBatchDelete = useStore(state => state.handleBatchDelete);
    const handleChatGenerate = useStore(state => state.handleChatGenerate);
    const updateCardContent = useStore(state => state.updateCardContent);
    const toggleFavorite = useStore(state => state.toggleFavorite);
    const createGroup = useStore(state => state.createGroup);
    const getConnectedCards = useStore(state => state.getConnectedCards);
    const setSelectedIds = useStore(state => state.setSelectedIds);
    const arrangeSelectionGrid = useStore(state => state.arrangeSelectionGrid);
    const setLastSavedAt = useStore(state => state.setLastSavedAt);

    // Custom Hooks
    const cardCreator = useCardCreator();
    const { t } = useLanguage();
    const toast = useToast();
    const { handleQuickSprout, handleSprout, handleDirectedSprout, handleExpandTopics } = useAISprouting();

    // Derived State
    const currentBoard = boardsList.find(b => b.id === currentBoardId);
    const hasBackgroundImage = !!currentBoard?.backgroundImage;

    // Thumbnail Capture REMOVED per user request
    const canvasContainerRef = useRef(null);

    // Local State
    const [cloudSyncStatus, setCloudSyncStatus] = useState('idle');
    const [globalImages, setGlobalImages] = useState([]);
    const [clipboard, setClipboard] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [quickPrompt, setQuickPrompt] = useState({ isOpen: false, x: 0, y: 0, canvasX: 0, canvasY: 0 });
    const [tempInstructions, setTempInstructions] = useState([]);

    // --- EFFECTS ---

    // Document Title
    useEffect(() => {
        if (currentBoardId) {
            const board = boardsList.find(b => b.id === currentBoardId);
            document.title = board ? `${board.name} | NexMap` : 'NexMap';
        }
        return () => { document.title = 'NexMap'; };
    }, [currentBoardId, boardsList]);

    // Autosave Logic
    const lastSavedState = useRef('');
    useEffect(() => {
        if (isBoardLoading) return;
        if (isHydratingFromCloud) {
            debugLog.sync('Skipping autosave: hydrating from cloud');
            return;
        }
        if (currentBoardId && cards.length > 0) {
            const currentStateObj = {
                cards: cards.map(c => ({ ...c, data: { ...c.data } })),
                connections: connections || [],
                groups: groups || [],
                boardPrompts: boardPrompts || []
            };
            const currentState = JSON.stringify(currentStateObj);

            if (currentState === lastSavedState.current) return;

            const saveTimeout = setTimeout(() => {
                try {
                    const now = Date.now();
                    saveBoard(currentBoardId, { cards, connections, groups, boardPrompts });
                    if (setLastSavedAt && typeof setLastSavedAt === 'function') {
                        setLastSavedAt(now);
                    }
                    lastSavedState.current = currentState;
                    debugLog.storage(`Local autosave complete for board: ${currentBoardId}`, { timestamp: now });
                } catch (e) {
                    console.error("[BoardPage] Autosave failed", e);
                    toast.error('保存失败，请检查存储空间');
                }
            }, 1000);

            let cloudTimeout;
            if (user) {
                cloudTimeout = setTimeout(async () => {
                    setCloudSyncStatus('syncing');
                    try {
                        await saveBoardToCloud(user.uid, currentBoardId, { cards, connections, groups, boardPrompts });
                        setCloudSyncStatus('synced');
                        debugLog.sync(`Cloud autosave complete for board: ${currentBoardId}`);
                    } catch (e) {
                        setCloudSyncStatus('error');
                        console.error('[BoardPage] Cloud sync failed:', e);
                        toast.error('云同步失败');
                    }
                }, 30000); // 30 seconds
            }

            return () => {
                clearTimeout(saveTimeout);
                if (cloudTimeout) clearTimeout(cloudTimeout);
            };
        }
    }, [cards, connections, groups, boardPrompts, currentBoardId, user, isBoardLoading, isHydratingFromCloud, setLastSavedAt, toast]);

    // Persist Viewport
    useEffect(() => {
        if (currentBoardId && !isBoardLoading) {
            saveViewportState(currentBoardId, { offset, scale });
        }
    }, [offset, scale, currentBoardId, isBoardLoading]);

    // Hotkeys
    useGlobalHotkeys(clipboard, setClipboard);

    // Global Paste Listener (Images)
    useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData.items;
            for (const item of items) {
                if (item.type.indexOf("image") !== -1) {
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (event) => setGlobalImages(prev => [...prev, {
                        file, previewUrl: URL.createObjectURL(file), base64: event.target.result.split(',')[1], mimeType: file.type
                    }]);
                    reader.readAsDataURL(file);
                    e.preventDefault();
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    // --- HANDLERS ---

    const handleGlobalImageUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => setGlobalImages(prev => [...prev, {
                file, previewUrl: URL.createObjectURL(file), base64: e.target.result.split(',')[1], mimeType: file.type
            }]);
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const removeGlobalImage = (index) => {
        setGlobalImages(prev => {
            const next = [...prev];
            URL.revokeObjectURL(next[index].previewUrl);
            next.splice(index, 1);
            return next;
        });
    };

    const handleCanvasDoubleClick = (e) => {
        setQuickPrompt({
            isOpen: true,
            x: e.screenX,
            y: e.screenY,
            canvasX: e.canvasX,
            canvasY: e.canvasY
        });
    };

    const handleQuickPromptSubmit = (text) => {
        if (!quickPrompt.isOpen) return;
        cardCreator.handleCreateCard(text, [], { x: quickPrompt.canvasX, y: quickPrompt.canvasY });
    };

    const handleFullScreen = (cardId) => {
        navigate(`/board/${currentBoardId}/note/${cardId}`);
    };

    const handleChatModalGenerate = async (cardId, text, images = []) => {
        const freshCards = useStore.getState().cards;
        const card = freshCards.find(c => c.id === cardId);

        if (!card) return;

        let userContent;
        if (images.length > 0) {
            const imageParts = images.map(img => ({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: img.mimeType,
                    data: img.base64
                }
            }));
            userContent = [
                { type: 'text', text },
                ...imageParts
            ];
        } else {
            userContent = text;
        }

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
        setTempInstructions(prev => [...prev, prompt]);
        toast.success(`Added instruction: ${prompt.text.substring(0, 20)}...`);
    };

    const handleChatSubmitWithInstructions = async (text, images) => {
        let finalText = text;
        if (tempInstructions.length > 0) {
            const contextStr = tempInstructions.map(i => `[System Instruction: ${i.text}]`).join('\n');
            finalText = `${contextStr}\n\n${text}`;
        }
        await cardCreator.handleCreateCard(finalText, images);
        setTempInstructions([]);
    };

    const handlePromptDropOnCanvas = (prompt, x, y) => {
        cardCreator.handleCreateCard(prompt.text, [], { x, y });
    };

    const handlePromptDropOnCard = (cardId, prompt) => {
        handleChatModalGenerate(cardId, prompt.text, []);
    };

    // Directed Generation (Custom Sprout)
    const [customSproutPrompt, setCustomSproutPrompt] = useState({ isOpen: false, sourceId: null, x: 0, y: 0 });

    const handleCustomSprout = (sourceId) => {
        const sourceCard = cards.find(c => c.id === sourceId);
        if (!sourceCard) return;

        // Position modal to the right of the card, with bounds checking
        let screenX = (sourceCard.x * scale) + offset.x + 350 * scale;
        let screenY = (sourceCard.y * scale) + offset.y;

        // Ensure modal stays within viewport
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
        if (!customSproutPrompt.isOpen || !customSproutPrompt.sourceId) return;

        handleDirectedSprout(customSproutPrompt.sourceId, instruction);
        setCustomSproutPrompt({ isOpen: false, sourceId: null, x: 0, y: 0 });
    };

    return {
        // Data
        cards,
        connections,
        groups,
        selectedIds,
        generatingCardIds,
        expandedCardId,
        offset,
        scale,
        isBoardLoading,
        favoritesLastUpdate,
        boardPrompts,
        currentBoard,
        cloudSyncStatus,
        globalImages,
        clipboard,
        isSettingsOpen,
        quickPrompt,
        customSproutPrompt, // Exported State
        tempInstructions,
        t,
        noteId,
        currentBoardId,

        // Refs
        canvasContainerRef,

        // Actions & Handlers
        setIsSettingsOpen,
        setGlobalImages,
        setQuickPrompt,
        setCustomSproutPrompt,
        setExpandedCardId,
        setTempInstructions,
        navigate,
        toggleFavorite,
        updateCardFull,

        handleRegenerate,
        handleBatchDelete,
        handleGlobalImageUpload,
        removeGlobalImage,
        createGroup,
        arrangeSelectionGrid,

        // Complex Handlers
        handleCanvasDoubleClick,
        handleQuickPromptSubmit,
        handleCustomSprout, // Exported Handler
        handleCustomSproutSubmit, // Exported Handler
        handleFullScreen,
        handleChatModalGenerate,
        handleSelectConnected,
        handleChatSubmitWithInstructions,
        handlePromptDropOnChat,
        handlePromptDropOnCanvas,
        handlePromptDropOnCard,
        handleQuickSprout,
        handleSprout,
        handleExpandTopics,

        // Card Creator exports
        ...cardCreator
    };
}
