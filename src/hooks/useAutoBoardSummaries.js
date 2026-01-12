import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { loadBoard } from '../services/storage';
import useBoardBackground from './useBoardBackground';

export function useAutoBoardSummaries(boardsList, onUpdateBoardMetadata) {
    const isProcessingRef = useRef(false);
    const processedBoardIdsRef = useRef(new Set());
    const { getRoleModel, activeId, providers } = useStore();
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
            !b.backgroundImage &&
            !b.summary &&
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
                console.warn('[AutoSummary] Starting TEXT summary generation for:', candidate.name); // Warn for visibility
                const { aiSummaryService } = await import('../services/aiSummaryService');
                const fullBoardData = await loadBoard(candidate.id);

                if (!fullBoardData || !fullBoardData.cards) {
                    console.warn('[AutoSummary] Board data empty, skipping:', candidate.name);
                    return;
                }

                const config = getRoleConfig('analysis');
                const { summary, theme } = await aiSummaryService.generateBoardSummary(
                    candidate,
                    fullBoardData.cards,
                    config
                ) || {};

                if (summary) {
                    console.warn('[AutoSummary] Generated stats:', { summaryLength: summary.length, theme });
                    // Save explicitly
                    if (onUpdateBoardMetadata) {
                        await onUpdateBoardMetadata(candidate.id, {
                            summary: { summary, theme }
                        });
                        console.warn('[AutoSummary] Saved summary to metadata');
                    }
                } else {
                    console.warn('[AutoSummary] No summary generated (filtered or empty)');
                }

            } else if (cardCount >= 10) {
                // Generate IMAGE background
                await generateBackground(candidate.id, onUpdateBoardMetadata);
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
