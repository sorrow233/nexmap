import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { recommendBoardInstructionIds } from '../services/ai/boardInstructionRecommender';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings,
    readCustomInstructionsFromLocalStorage,
    normalizeCustomInstructionsValue,
    saveBoardInstructionSettingsCache,
    sanitizeBoardInstructionSettingsForCatalog,
    getInstructionCatalogBreakdown
} from '../services/customInstructionsService';

const isSameStringArray = (a = [], b = []) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

export function useBoardLogic({ user, boardsList, onUpdateBoardTitle, onBack, isReadOnly = false }) {
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
    const boardInstructionSettings = useStore(state => state.boardInstructionSettings);
    const globalPrompts = useStore(state => state.globalPrompts);
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
    const currentBoard = boardsList.find(b => b.id === currentBoardId);
    const hasBackgroundImage = !!currentBoard?.backgroundImage;
    const conversationCount = cards.reduce((total, card) => {
        const messages = card?.data?.messages || [];
        const userCount = messages.filter(msg => msg?.role === 'user').length;
        return total + userCount;
    }, 0);
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
            mode: normalizedBoardInstructionSettings.autoSelectionMode === 'manual' ? 'manual' : 'auto',
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
            document.title = board ? `${board.name} | NexMap` : 'NexMap';
        }
        return () => { document.title = 'NexMap'; };
    }, [currentBoardId, boardsList]);

    // Keep a ref of the latest data for unmount saving
    const latestBoardDataRef = useRef({ cards, connections, groups, boardPrompts, boardInstructionSettings });
    useEffect(() => {
        latestBoardDataRef.current = { cards, connections, groups, boardPrompts, boardInstructionSettings };
    }, [cards, connections, groups, boardPrompts, boardInstructionSettings]);

    // Autosave Logic (Debounced)
    const lastSavedState = useRef('');

    // Save function reused for both debounce and unmount
    const performSave = useCallback((data, isUnmount = false) => {
        if (!currentBoardId) return;

        try {
            const now = Date.now();
            // Synchronous LocalStorage update happens inside here
            saveBoard(currentBoardId, data);

            if (setLastSavedAt && typeof setLastSavedAt === 'function') {
                setLastSavedAt(now);
            }

            // Update ref
            const stateCustom = {
                cards: data.cards.map(c => ({ ...c, data: { ...c.data } })),
                connections: data.connections || [],
                groups: data.groups || [],
                boardPrompts: data.boardPrompts || [],
                boardInstructionSettings: normalizeBoardInstructionSettings(
                    data.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
                )
            };
            lastSavedState.current = JSON.stringify(stateCustom);

            if (!isUnmount) {
                debugLog.storage(`Local autosave complete for board: ${currentBoardId}`, { timestamp: now });
            } else {
                debugLog.storage(`Unmount save complete for board: ${currentBoardId}`);
            }
        } catch (e) {
            console.error("[BoardPage] Save failed", e);
            if (!isUnmount) toast.error('保存失败，请检查存储空间');
        }
    }, [currentBoardId, setLastSavedAt, toast]);

    // 1. Debounced Autosave Effect
    useEffect(() => {
        if (isBoardLoading) return;
        if (isHydratingFromCloud) return;
        if (isReadOnly) return; // CRITICAL: Skip all writes in Read-Only mode

        const hasInstructionState =
            normalizedBoardInstructionSettings.enabledInstructionIds.length > 0 ||
            normalizedBoardInstructionSettings.autoEnabledInstructionIds.length > 0 ||
            normalizedBoardInstructionSettings.autoSelection.lastRunAt > 0;

        if (currentBoardId && (cards.length > 0 || boardPrompts.length > 0 || hasInstructionState)) {
            const currentStateObj = {
                cards: cards.map(c => ({ ...c, data: { ...c.data } })),
                connections: connections || [],
                groups: groups || [],
                boardPrompts: boardPrompts || [],
                boardInstructionSettings: normalizedBoardInstructionSettings
            };
            const currentState = JSON.stringify(currentStateObj);

            if (currentState === lastSavedState.current) return;

            const saveTimeout = setTimeout(() => {
                performSave({
                    cards,
                    connections,
                    groups,
                    boardPrompts,
                    boardInstructionSettings: normalizedBoardInstructionSettings
                });
            }, 1000);

            // Cloud sync (keep existing logic)
            let cloudTimeout;
            if (user) {
                cloudTimeout = setTimeout(async () => {
                    setCloudSyncStatus('syncing');
                    try {
                        await saveBoardToCloud(user.uid, currentBoardId, {
                            cards,
                            connections,
                            groups,
                            boardPrompts,
                            boardInstructionSettings: normalizedBoardInstructionSettings
                        });
                        setCloudSyncStatus('synced');
                        debugLog.sync(`Cloud autosave complete for board: ${currentBoardId}`);
                    } catch (e) {
                        setCloudSyncStatus('error');
                        console.error('[BoardPage] Cloud sync failed:', e);
                        toast.error('云同步失败');
                    }
                }, 30000);
            }

            return () => {
                clearTimeout(saveTimeout);
                if (cloudTimeout) clearTimeout(cloudTimeout);
            };
        }
    }, [cards, connections, groups, boardPrompts, boardInstructionSettings, currentBoardId, user, isBoardLoading, isHydratingFromCloud, performSave, isReadOnly, toast]);

    // 2. Unmount / Navigation Save Effect
    useEffect(() => {
        return () => {
            // Check if we have unsaved changes on unmount
            const data = latestBoardDataRef.current;
            const currentStateObj = {
                cards: data.cards.map(c => ({ ...c, data: { ...c.data } })),
                connections: data.connections || [],
                groups: data.groups || [],
                boardPrompts: data.boardPrompts || [],
                boardInstructionSettings: normalizeBoardInstructionSettings(
                    data.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
                )
            };
            const currentState = JSON.stringify(currentStateObj);

            // If strictly different from last saved, force save
            if (currentState !== lastSavedState.current && currentBoardId) {
                console.log('[BoardLogic] Unmount detected with unsaved changes. Saving immediately.');
                // We call the imported saveBoard directly or the helper. 
                // Since performSave relies on closure variables that might be stale in cleanup if not careful,
                // we use the data from the REF.
                // Re-implementing the core synchronous part of save here to be 100% safe

                // Note: We cannot execute async await here effectively, but saveBoard does synchronous LS update first.
                saveBoard(currentBoardId, {
                    ...data,
                    boardInstructionSettings: normalizeBoardInstructionSettings(
                        data.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
                    )
                });
            }
        };
    }, [currentBoardId]);

    // Persist Viewport (debounced to avoid sync localStorage writes on every pan frame)
    useEffect(() => {
        if (!currentBoardId || isBoardLoading) return;

        const timer = setTimeout(() => {
            saveViewportState(currentBoardId, { offset, scale });
        }, 120);

        return () => clearTimeout(timer);
    }, [offset, scale, currentBoardId, isBoardLoading]);

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

    const runAutoInstructionRecommendation = useCallback(async (force = false) => {
        if (isReadOnly || !currentBoardId) return;
        if (autoRecommendLockRef.current) return;

        const latestCatalog = normalizeCustomInstructionsValue(readCustomInstructionsFromLocalStorage());
        setCustomInstructionCatalog(latestCatalog);

        const optionalCandidates = (latestCatalog.items || []).filter(
            item => item.enabled !== false && item.isGlobal !== true
        );
        if (optionalCandidates.length === 0) {
            if (force) {
                toast.info(t?.settings?.canvasInstructionNoOptionalToast || '当前没有可推荐的画布指令');
            }
            return;
        }

        if (!force) {
            if (normalizedBoardInstructionSettings.autoSelectionMode === 'manual') return;
            if (conversationCount <= 2) return;
            if (normalizedBoardInstructionSettings.autoSelection.status === 'running') return;

            const lastCount = normalizedBoardInstructionSettings.autoSelection.lastConversationCount || 0;
            const hasEnoughNewConversation = conversationCount >= Math.max(3, lastCount + 2);
            if (!hasEnoughNewConversation) return;
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
                    lastTrigger: force ? 'manual' : 'auto'
                }
            };
        });

        try {
            const state = useStore.getState();
            const analysisConfig = state.getRoleConfig?.('analysis') || state.getRoleConfig?.('chat');
            const recommendedIds = await recommendBoardInstructionIds({
                cards,
                instructions: latestCatalog.items || [],
                config: analysisConfig
            });

            updateBoardInstructionSettings(prev => {
                const current = normalizeBoardInstructionSettings(prev);
                const next = {
                    ...current,
                    autoEnabledInstructionIds: recommendedIds,
                    autoSelection: {
                        status: 'done',
                        lastRunAt: Date.now(),
                        lastConversationCount: conversationCount,
                        lastError: '',
                        lastResultCount: recommendedIds.length,
                        lastTrigger: force ? 'manual' : 'auto'
                    }
                };

                if (current.autoSelectionMode !== 'manual') {
                    next.enabledInstructionIds = recommendedIds;
                }
                return next;
            });

            if (force) {
                if (recommendedIds.length > 0) {
                    toast.success(
                        (t?.settings?.canvasInstructionRecommendDoneToast || 'AI 推荐完成：{count} 条').replace('{count}', String(recommendedIds.length))
                    );
                } else {
                    toast.warning(t?.settings?.canvasInstructionRecommendEmptyToast || 'AI 没有找到强相关指令');
                }
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
                        lastTrigger: force ? 'manual' : 'auto'
                    }
                };
            });
            if (force) {
                toast.error(t?.settings?.canvasInstructionRecommendFailToast || 'AI 推荐失败，请稍后重试');
            }
        } finally {
            setIsAutoRecommending(false);
            autoRecommendLockRef.current = false;
        }
    }, [
        cards,
        conversationCount,
        currentBoardId,
        isReadOnly,
        normalizedBoardInstructionSettings,
        t,
        toast,
        updateBoardInstructionSettings
    ]);

    useEffect(() => {
        if (conversationCount > 2 && normalizedBoardInstructionSettings.autoSelectionMode === 'auto') {
            runAutoInstructionRecommendation(false);
        }
    }, [conversationCount, normalizedBoardInstructionSettings.autoSelectionMode, runAutoInstructionRecommendation]);


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
        const freshCards = useStore.getState().cards;
        const card = freshCards.find(c => c.id === cardId);

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

    const handleUseManualInstructionMode = () => {
        if (isReadOnly) return;
        updateBoardInstructionSettings(prev => ({
            ...normalizeBoardInstructionSettings(prev),
            autoSelectionMode: 'manual'
        }));
    };

    const handleUseAutoInstructionMode = () => {
        if (isReadOnly) return;
        updateBoardInstructionSettings(prev => {
            const current = normalizeBoardInstructionSettings(prev);
            return {
                ...current,
                autoSelectionMode: 'auto',
                enabledInstructionIds: [...current.autoEnabledInstructionIds]
            };
        });
    };

    const handleRunAutoInstructionRecommendNow = async () => {
        await runAutoInstructionRecommendation(true);
    };

    // Directed Generation (Custom Sprout)
    const [customSproutPrompt, setCustomSproutPrompt] = useState({ isOpen: false, sourceId: null, x: 0, y: 0 });

    const handleCustomSprout = (sourceId) => {
        if (isReadOnly) return;
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
        if (isReadOnly || !customSproutPrompt.isOpen || !customSproutPrompt.sourceId) return;

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
        handleAgentSubmit,
        handlePromptDropOnChat,
        handlePromptDropOnCanvas,
        handlePromptDropOnCard,
        handleOpenInstructionPanel,
        handleOpenInstructionSettings,
        handleToggleBoardInstruction,
        handleUseManualInstructionMode,
        handleUseAutoInstructionMode,
        handleRunAutoInstructionRecommendNow,
        handleQuickSprout,
        handleSprout,
        handleExpandTopics,
        handleGlobalPaste,

        // Card Creator exports
        ...cardCreator
    };
}
