import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useCardCreator } from '../hooks/useCardCreator';
import { useGlobalHotkeys } from '../hooks/useGlobalHotkeys';
import { useToast } from '../components/Toast';
// import { useThumbnailCapture } from '../hooks/useThumbnailCapture';
import { useAISprouting } from '../hooks/useAISprouting';
import { useLanguage } from '../contexts/LanguageContext';
import { useStoreStateRef } from './useStoreStateRef';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings,
    readCustomInstructionsFromLocalStorage,
    normalizeCustomInstructionsValue,
    saveBoardInstructionSettingsCache,
    sanitizeBoardInstructionSettingsForCatalog,
    getInstructionCatalogBreakdown
} from '../services/customInstructionsService';
import { getBoardDisplayName } from '../services/boardTitle/metadata';

const isSameStringArray = (a = [], b = []) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

export function useBoardLogic({ boardsList, onUpdateBoardMetadata, isReadOnly = false }) {
    const { id: currentBoardId, noteId } = useParams();
    const navigate = useNavigate();

    // Store Selectors
    const selectedIds = useStore(state => state.selectedIds);
    const generatingCardIds = useStore(state => state.generatingCardIds);
    const expandedCardId = useStore(state => state.expandedCardId);
    const boardPrompts = useStore(state => state.boardPrompts);
    const boardInstructionSettings = useStore(state => state.boardInstructionSettings);
    const globalPrompts = useStore(state => state.globalPrompts);
    const conversationCount = useStore(state => state.cards.reduce((total, card) => {
        const messages = card?.data?.messages || [];
        let userCount = 0;
        for (const message of messages) {
            if (message?.role === 'user') {
                userCount += 1;
            }
        }
        return total + userCount;
    }, 0));
    const selectedPrimaryCardHasMarks = useStore(state => {
        if (!state.selectedIds || state.selectedIds.length !== 1) return false;
        const selectedCard = state.cards.find(card => card.id === state.selectedIds[0]);
        return Boolean(selectedCard?.data?.marks?.length);
    });
    const expandedCard = useStore(state => {
        if (!state.expandedCardId) return null;
        return state.cards.find(card => card.id === state.expandedCardId) || null;
    });
    const storeStateRef = useStoreStateRef();

    // Store Actions
    const setExpandedCardId = useStore(state => state.setExpandedCardId);
    const updateCardFull = useStore(state => state.updateCardFull);
    const handleRegenerate = useStore(state => state.handleRegenerate);
    const handleBatchDelete = useStore(state => state.handleBatchDelete);
    const handleChatGenerate = useStore(state => state.handleChatGenerate);
    const updateCardContent = useStore(state => state.updateCardContent);
    const toggleFavorite = useStore(state => state.toggleFavorite);
    const createGroup = useStore(state => state.createGroup);
    const updateBoardInstructionSettings = useStore(state => state.updateBoardInstructionSettings);

    // Custom Hooks
    const cardCreator = useCardCreator();
    const { t } = useLanguage();
    const toast = useToast();
    const {
        handleQuickSprout,
        handleSprout,
        handleDirectedSprout,
        handleExpandTopics,
        handleAgentSubmit: handleAgentPlanSubmit
    } = useAISprouting();

    // Derived State
    const currentBoard = useMemo(
        () => boardsList.find(b => b.id === currentBoardId),
        [boardsList, currentBoardId]
    );
    const normalizedBoardInstructionSettings = useMemo(
        () => normalizeBoardInstructionSettings(boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS),
        [boardInstructionSettings]
    );

    // Thumbnail Capture REMOVED per user request
    const canvasContainerRef = useRef(null);

    // Local State
    const [cloudSyncStatus, setCloudSyncStatus] = useState('idle');
    const [globalImages, setGlobalImages] = useState([]);
    const [clipboard, setClipboard] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [quickPrompt, setQuickPrompt] = useState({ isOpen: false, x: 0, y: 0, canvasX: 0, canvasY: 0 });
    const [tempInstructions, setTempInstructions] = useState([]);
    const [isAgentRunning, setIsAgentRunning] = useState(false);
    const [isInstructionPanelOpen, setIsInstructionPanelOpen] = useState(false);
    const [isAutoRecommending, setIsAutoRecommending] = useState(false);
    const [customInstructionCatalog, setCustomInstructionCatalog] = useState(
        normalizeCustomInstructionsValue(readCustomInstructionsFromLocalStorage())
    );
    const autoRecommendLockRef = useRef(false);

    const instructionCatalogBreakdown = useMemo(
        () => getInstructionCatalogBreakdown(customInstructionCatalog),
        [customInstructionCatalog]
    );

    const instructionPanelSummary = useMemo(() => {
        const enabledSet = new Set(normalizedBoardInstructionSettings.enabledInstructionIds);
        const autoSet = new Set(normalizedBoardInstructionSettings.autoEnabledInstructionIds);
        const enabledOptionalCount = instructionCatalogBreakdown.optionalInstructions.filter(item => enabledSet.has(item.id)).length;
        const autoEnabledOptionalCount = instructionCatalogBreakdown.optionalInstructions.filter(item => autoSet.has(item.id)).length;
        const globalCount = instructionCatalogBreakdown.globalInstructions.length;

        return {
            totalCount: instructionCatalogBreakdown.allInstructions.length,
            globalCount,
            optionalCount: instructionCatalogBreakdown.optionalInstructions.length,
            enabledOptionalCount,
            autoEnabledOptionalCount,
            activeCount: globalCount + enabledOptionalCount,
            mode: 'manual',
            status: normalizedBoardInstructionSettings.autoSelection?.status || 'idle',
            lastRunAt: normalizedBoardInstructionSettings.autoSelection?.lastRunAt || 0
        };
    }, [instructionCatalogBreakdown, normalizedBoardInstructionSettings]);

    // --- PASTE LOGIC ---

    const handleGlobalPaste = useCallback((e) => {
        const items = e.clipboardData.items;
        let hasImage = false;
        for (const item of items) {
            if (item.type.indexOf("image") !== -1) {
                hasImage = true;
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => setGlobalImages(prev => [...prev, {
                    file, previewUrl: URL.createObjectURL(file), base64: event.target.result.split(',')[1], mimeType: file.type
                }]);
                reader.readAsDataURL(file);
            }
        }
        // 只在有图片时阻止默认行为和冒泡，避免重复处理
        if (hasImage) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, []);


    // --- EFFECTS ---

    // Document Title
    useEffect(() => {
        if (currentBoardId) {
            const board = boardsList.find(b => b.id === currentBoardId);
            const displayName = getBoardDisplayName(board, t.gallery?.untitledBoard || 'Untitled Board');
            document.title = board ? `${displayName} | NexMap` : 'NexMap';
        }
        return () => { document.title = 'NexMap'; };
    }, [currentBoardId, boardsList, t.gallery?.untitledBoard]);

    // Hotkeys
    useGlobalHotkeys(clipboard, setClipboard);

    // Global Paste Listener (Images) - ONLY for canvas-level, NOT for card modals
    useEffect(() => {
        const handlePaste = (e) => {
            // Skip if user is focused INSIDE a modal (card chat)
            const activeEl = document.activeElement;
            const isInsideModal = activeEl?.closest('.chat-modal, [role="dialog"]');

            if (isInsideModal) {
                // Let the card-level useImageUpload handle this paste event
                return;
            }

            // Otherwise, apply global paste logic (for canvas or global ChatBar)
            handleGlobalPaste(e);
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handleGlobalPaste]);

    // Keep active board instruction settings cache in localStorage (used by AIManager sync read)
    useEffect(() => {
        if (!currentBoardId) return;
        saveBoardInstructionSettingsCache(currentBoardId, normalizedBoardInstructionSettings);
    }, [currentBoardId, normalizedBoardInstructionSettings]);

    const refreshCustomInstructionCatalog = useCallback(() => {
        setCustomInstructionCatalog(normalizeCustomInstructionsValue(readCustomInstructionsFromLocalStorage()));
    }, []);

    useEffect(() => {
        if (isInstructionPanelOpen) {
            refreshCustomInstructionCatalog();
        }
    }, [isInstructionPanelOpen, refreshCustomInstructionCatalog]);

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === 'mixboard_custom_instructions') {
                refreshCustomInstructionCatalog();
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [refreshCustomInstructionCatalog]);

    useEffect(() => {
        if (isReadOnly || !currentBoardId) return;

        const sanitized = sanitizeBoardInstructionSettingsForCatalog(
            normalizedBoardInstructionSettings,
            customInstructionCatalog
        );

        const shouldUpdate =
            !isSameStringArray(sanitized.enabledInstructionIds, normalizedBoardInstructionSettings.enabledInstructionIds) ||
            !isSameStringArray(sanitized.autoEnabledInstructionIds, normalizedBoardInstructionSettings.autoEnabledInstructionIds);

        if (shouldUpdate) {
            updateBoardInstructionSettings(sanitized);
        }
    }, [
        currentBoardId,
        customInstructionCatalog,
        isReadOnly,
        normalizedBoardInstructionSettings,
        updateBoardInstructionSettings
    ]);

    const runAutoInstructionRecommendation = useCallback(async () => {
        if (isReadOnly || !currentBoardId) return;
        if (autoRecommendLockRef.current) return;

        const latestCatalog = normalizeCustomInstructionsValue(readCustomInstructionsFromLocalStorage());
        setCustomInstructionCatalog(latestCatalog);

        const optionalCandidates = (latestCatalog.items || []).filter(
            item => item.enabled !== false && item.isGlobal !== true
        );
        if (optionalCandidates.length === 0) {
            toast.info(t?.settings?.canvasInstructionNoOptionalToast || '当前没有可推荐的画布指令');
            return;
        }

        autoRecommendLockRef.current = true;
        setIsAutoRecommending(true);
        updateBoardInstructionSettings(prev => {
            const current = normalizeBoardInstructionSettings(prev);
            return {
                ...current,
                autoSelection: {
                    ...(current.autoSelection || {}),
                    status: 'running',
                    lastError: '',
                    lastTrigger: 'manual'
                }
            };
        });

        try {
            const state = useStore.getState();
            const analysisConfig = state.getRoleConfig?.('analysis') || state.getRoleConfig?.('chat');
            const { recommendBoardInstructionIds } = await import('../services/ai/boardInstructionRecommender');
            const recommendedIds = await recommendBoardInstructionIds({
                cards: storeStateRef.current.cards,
                instructions: latestCatalog.items || [],
                config: analysisConfig
            });

            updateBoardInstructionSettings(prev => {
                const current = normalizeBoardInstructionSettings(prev);
                const next = {
                    ...current,
                    autoEnabledInstructionIds: recommendedIds,
                    enabledInstructionIds: [...recommendedIds],
                    autoSelectionMode: 'manual',
                    autoSelection: {
                        status: 'done',
                        lastRunAt: Date.now(),
                        lastConversationCount: conversationCount,
                        lastError: '',
                        lastResultCount: recommendedIds.length,
                        lastTrigger: 'manual'
                    }
                };
                return next;
            });

            if (recommendedIds.length > 0) {
                toast.success(
                    (t?.settings?.canvasInstructionRecommendDoneToast || 'AI 推荐完成：{count} 条').replace('{count}', String(recommendedIds.length))
                );
            } else {
                toast.warning(t?.settings?.canvasInstructionRecommendEmptyToast || 'AI 没有找到强相关指令');
            }
        } catch (error) {
            const reason = error?.message || 'auto_recommend_failed';
            updateBoardInstructionSettings(prev => {
                const current = normalizeBoardInstructionSettings(prev);
                return {
                    ...current,
                    autoSelection: {
                        ...(current.autoSelection || {}),
                        status: 'error',
                        lastError: reason,
                        lastResultCount: 0,
                        lastTrigger: 'manual'
                    }
                };
            });
            toast.error(t?.settings?.canvasInstructionRecommendFailToast || 'AI 推荐失败，请稍后重试');
        } finally {
            setIsAutoRecommending(false);
            autoRecommendLockRef.current = false;
        }
    }, [
        conversationCount,
        currentBoardId,
        isReadOnly,
        storeStateRef,
        t,
        toast,
        updateBoardInstructionSettings
    ]);


    // --- HANDLERS ---

    const handleGlobalImageUpload = (e) => {
        if (isReadOnly) return;
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
        if (isReadOnly) return;
        setGlobalImages(prev => {
            const next = [...prev];
            URL.revokeObjectURL(next[index].previewUrl);
            next.splice(index, 1);
            return next;
        });
    };

    const handleCanvasDoubleClick = (e) => {
        if (isReadOnly) return;
        setQuickPrompt({
            isOpen: true,
            x: e.screenX,
            y: e.screenY,
            canvasX: e.canvasX,
            canvasY: e.canvasY
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
        const card = useStore.getState().getCardById?.(cardId) || null;

        if (!card) return;

        let finalText = text;
        if (tempInstructions.length > 0) {
            const contextStr = tempInstructions.map(i => `[System Instruction: ${i.content || i.text}]`).join('\n');
            finalText = `${contextStr}\n\n${text}`;
            setTempInstructions([]); // Clear after use
        }

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
                { type: 'text', text: finalText },
                ...imageParts
            ];
        } else {
            userContent = finalText;
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

    const handlePromptDropOnChat = (prompt) => {
        if (isReadOnly) return;
        setTempInstructions(prev => [...prev, prompt]);
        toast.success(`Added instruction: ${prompt.text.substring(0, 20)}...`);
    };

    const handleChatSubmitWithInstructions = async (text, images) => {
        if (isReadOnly) return;
        let finalText = text;
        if (tempInstructions.length > 0) {
            const contextStr = tempInstructions.map(i => `[System Instruction: ${i.text}]`).join('\n');
            finalText = `${contextStr}\n\n${text}`;
        }
        await cardCreator.handleCreateCard(finalText, images);
        setTempInstructions([]);
    };

    const handleAgentSubmit = async (text, images) => {
        if (isReadOnly || isAgentRunning) return;
        let finalText = text;
        if (tempInstructions.length > 0) {
            const contextStr = tempInstructions.map(i => `[System Instruction: ${i.text}]`).join('\n');
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
        } catch (e) {
            toast.error(`Agent mode failed: ${e?.message || 'Unknown error'}`);
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

    const handleOpenInstructionPanel = () => {
        if (isReadOnly) return;
        refreshCustomInstructionCatalog();
        setIsInstructionPanelOpen(true);
    };

    const handleOpenInstructionSettings = () => {
        if (isReadOnly) return;
        setIsInstructionPanelOpen(false);
        setIsSettingsOpen(true);
    };

    const handleToggleBoardInstruction = (instructionId, enabled) => {
        if (isReadOnly) return;
        updateBoardInstructionSettings(prev => {
            const current = normalizeBoardInstructionSettings(prev);
            const enabledSet = new Set(current.enabledInstructionIds);
            if (enabled) enabledSet.add(instructionId);
            else enabledSet.delete(instructionId);

            return {
                ...current,
                autoSelectionMode: 'manual',
                enabledInstructionIds: Array.from(enabledSet)
            };
        });
    };

    const handleRunAutoInstructionRecommendNow = async () => {
        await runAutoInstructionRecommendation();
    };

    // Directed Generation (Custom Sprout)
    const [customSproutPrompt, setCustomSproutPrompt] = useState({ isOpen: false, sourceId: null, x: 0, y: 0 });

    const handleCustomSprout = (sourceId) => {
        if (isReadOnly) return;
        const sourceCard = storeStateRef.current.getCardById?.(sourceId) || null;
        if (!sourceCard) return;

        // Position modal to the right of the card, with bounds checking
        const currentScale = storeStateRef.current.scale || 1;
        const currentOffset = storeStateRef.current.offset || { x: 0, y: 0 };
        let screenX = (sourceCard.x * currentScale) + currentOffset.x + 350 * currentScale;
        let screenY = (sourceCard.y * currentScale) + currentOffset.y;

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
        if (isReadOnly || !customSproutPrompt.isOpen || !customSproutPrompt.sourceId) return;

        handleDirectedSprout(customSproutPrompt.sourceId, instruction);
        setCustomSproutPrompt({ isOpen: false, sourceId: null, x: 0, y: 0 });
    };

    return {
        // Data
        selectedIds,
        generatingCardIds,
        expandedCardId,
        expandedCard,
        selectedPrimaryCardHasMarks,
        boardPrompts,
        boardInstructionSettings: normalizedBoardInstructionSettings,
        customInstructionCatalog,
        instructionPanelSummary,
        conversationCount,
        currentBoard,
        cloudSyncStatus,
        globalPrompts,
        globalImages,
        clipboard,
        isSettingsOpen,
        isInstructionPanelOpen,
        isAutoRecommending,
        quickPrompt,
        customSproutPrompt, // Exported State
        tempInstructions,
        isAgentRunning,
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
        setIsInstructionPanelOpen,
        navigate,
        toggleFavorite,
        updateCardFull,
        setCloudSyncStatus,

        handleRegenerate,
        handleBatchDelete,
        handleGlobalImageUpload,
        removeGlobalImage,
        createGroup,

        // Complex Handlers
        handleCanvasDoubleClick,
        handleQuickPromptSubmit,
        handleCustomSprout, // Exported Handler
        handleCustomSproutSubmit, // Exported Handler
        handleFullScreen,
        handleChatModalGenerate,
        handleChatSubmitWithInstructions,
        handleAgentSubmit,
        handlePromptDropOnChat,
        handlePromptDropOnCanvas,
        handlePromptDropOnCard,
        handleOpenInstructionPanel,
        handleOpenInstructionSettings,
        handleToggleBoardInstruction,
        handleRunAutoInstructionRecommendNow,
        handleQuickSprout,
        handleSprout,
        handleExpandTopics,
        handleGlobalPaste,

        // Card Creator exports
        ...cardCreator
    };
}
