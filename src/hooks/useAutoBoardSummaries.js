import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { loadBoard } from '../services/storage';
import useBoardBackground from './useBoardBackground';
import {
    createAutoImageCompletedPatch,
    createAutoSummaryCompletedPatch,
    hasAutoImageCompleted
} from '../services/boardAutoGeneration/metadata';
import { runtimeWarn } from '../utils/runtimeLogging';

export function useAutoBoardSummaries(boardsList, onUpdateBoardMetadata) {
    const isProcessingRef = useRef(false);
    const processedBoardIdsRef = useRef(new Set());
    const { generateBackground } = useBoardBackground();

    useEffect(() => {
        // Debounce slightly to allow list to settle
        const timer = setTimeout(() => {
            processNextBoard();
        }, 2000);

        return () => clearTimeout(timer);
    }, [boardsList]);

    const getRoleConfig = (role) => {
        return useStore.getState().getRoleConfig(role);
    };

    const processNextBoard = async () => {
        if (isProcessingRef.current) return;

        // Filter candidates: 
        // 1. Not deleted
        // 2. Has at least 3 cards
        // 3. No background image AND no summary (needs generation)
        // 4. Not already processed in this session
        const candidate = boardsList.find(b =>
            !b.deletedAt &&
            (b.cardCount >= 3) &&
            (
                ((b.cardCount || 0) >= 10 && !b.backgroundImage && !hasAutoImageCompleted(b)) ||
                ((b.cardCount || 0) >= 3 && (b.cardCount || 0) < 10 && !b.backgroundImage && !b.summary)
            ) &&
            !processedBoardIdsRef.current.has(b.id)
        );

        if (!candidate) return;

        try {
            isProcessingRef.current = true;
            processedBoardIdsRef.current.add(candidate.id);

            const cardCount = candidate.cardCount || 0;

            // RULE: 3-9 cards = Text Summary, 10+ cards = Image Background
            if (cardCount >= 3 && cardCount < 10) {
                // Generate TEXT summary only
                runtimeWarn('[AutoSummary] Starting TEXT summary generation for:', candidate.name);
                const { aiSummaryService } = await import('../services/aiSummaryService');
                const fullBoardData = await loadBoard(candidate.id);

                if (!fullBoardData || !fullBoardData.cards) {
                    runtimeWarn('[AutoSummary] Board data empty, skipping:', candidate.name);
                    return;
                }

                const config = getRoleConfig('analysis');
                const { summary, theme } = await aiSummaryService.generateBoardSummary(
                    candidate,
                    fullBoardData.cards,
                    config
                ) || {};

                if (summary) {
                    runtimeWarn('[AutoSummary] Generated stats:', { summaryLength: summary.length, theme });
                    // Save explicitly
                    if (onUpdateBoardMetadata) {
                        await onUpdateBoardMetadata(candidate.id, {
                            summary: { summary, theme },
                            ...createAutoSummaryCompletedPatch()
                        });
                        runtimeWarn('[AutoSummary] Saved summary to metadata');
                    }
                } else {
                    runtimeWarn('[AutoSummary] No summary generated (filtered or empty)');
                }

            } else if (cardCount >= 10) {
                // Generate IMAGE background
                const imageUrl = await generateBackground(candidate.id, onUpdateBoardMetadata);
                if (imageUrl && onUpdateBoardMetadata) {
                    await onUpdateBoardMetadata(candidate.id, createAutoImageCompletedPatch());
                }
            }

        } catch (error) {
            console.error('[AutoSummary] Failed to auto-generate for', candidate.id, error);
        } finally {
            isProcessingRef.current = false;
            // Trigger next check
            setTimeout(processNextBoard, 1000);
        }
    };
}
