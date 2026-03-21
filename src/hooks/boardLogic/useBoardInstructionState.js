import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import {
    normalizeBoardInstructionSettings,
    readCustomInstructionsFromLocalStorage,
    normalizeCustomInstructionsValue,
    saveBoardInstructionSettingsCache,
    sanitizeBoardInstructionSettingsForCatalog,
    getInstructionCatalogBreakdown
} from '../../services/customInstructionsService';

const isSameStringArray = (left = [], right = []) => {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) return false;
    }
    return true;
};

export function useBoardInstructionState({
    currentBoardId,
    cards,
    conversationCount,
    normalizedBoardInstructionSettings,
    isReadOnly,
    setIsSettingsOpen,
    t,
    toast
}) {
    const updateBoardInstructionSettings = useStore(state => state.updateBoardInstructionSettings);
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
        const onStorage = (event) => {
            if (event.key === 'mixboard_custom_instructions') {
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
            const { recommendBoardInstructionIds } = await import('../../services/ai/boardInstructionRecommender');
            const recommendedIds = await recommendBoardInstructionIds({
                cards,
                instructions: latestCatalog.items || [],
                config: analysisConfig
            });

            updateBoardInstructionSettings(prev => {
                const current = normalizeBoardInstructionSettings(prev);
                return {
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
        cards,
        conversationCount,
        currentBoardId,
        isReadOnly,
        t,
        toast,
        updateBoardInstructionSettings
    ]);

    const handleOpenInstructionPanel = useCallback(() => {
        if (isReadOnly) return;
        refreshCustomInstructionCatalog();
        setIsInstructionPanelOpen(true);
    }, [isReadOnly, refreshCustomInstructionCatalog]);

    const handleOpenInstructionSettings = useCallback(() => {
        if (isReadOnly) return;
        setIsInstructionPanelOpen(false);
        setIsSettingsOpen(true);
    }, [isReadOnly, setIsSettingsOpen]);

    const handleToggleBoardInstruction = useCallback((instructionId, enabled) => {
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
    }, [isReadOnly, updateBoardInstructionSettings]);

    const handleRunAutoInstructionRecommendNow = useCallback(async () => {
        await runAutoInstructionRecommendation();
    }, [runAutoInstructionRecommendation]);

    return {
        isInstructionPanelOpen,
        setIsInstructionPanelOpen,
        isAutoRecommending,
        customInstructionCatalog,
        instructionPanelSummary,
        handleOpenInstructionPanel,
        handleOpenInstructionSettings,
        handleToggleBoardInstruction,
        handleRunAutoInstructionRecommendNow
    };
}
