import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { loadBoard } from '../services/storage';

export function useAutoBoardSummaries(boardsList, onUpdateBoardMetadata) {
    const isProcessingRef = useRef(false);
    const processedBoardIdsRef = useRef(new Set());
    const { getRoleModel, activeId, providers } = useStore();

    useEffect(() => {
        // Debounce slightly to allow list to settle
        const timer = setTimeout(() => {
            processNextBoard();
        }, 2000);

        return () => clearTimeout(timer);
    }, [boardsList]);

    const getLlmConfig = () => {
        const activeProvider = providers?.[activeId] || {
            baseUrl: 'https://api.gmi-serving.com/v1',
            apiKey: '',
            protocol: 'gemini'
        };
        return activeProvider;
    };

    const processNextBoard = async () => {
        if (isProcessingRef.current) return;

        // Filter candidates: 
        // 1. Not deleted
        // 2. Has cards (cardCount > 0)
        // 3. No background image
        // 4. No summary exists
        // 5. Not already processed in this session
        const candidate = boardsList.find(b =>
            !b.deletedAt &&
            (b.cardCount > 0) &&
            !b.backgroundImage &&
            !b.summary &&
            !processedBoardIdsRef.current.has(b.id)
        );

        if (!candidate) return;

        try {
            isProcessingRef.current = true;
            processedBoardIdsRef.current.add(candidate.id); // Mark as processed to avoid infinite loop on failure

            // console.log('[AutoSummary] Processing board:', candidate.name, candidate.id);

            // Lazy load service to avoid circular deps
            const { aiSummaryService } = await import('../services/aiSummaryService');

            // Load full board data (we need cards content)
            const fullBoardData = await loadBoard(candidate.id);

            if (!fullBoardData || !fullBoardData.cards || fullBoardData.cards.length === 0) {
                isProcessingRef.current = false;
                return;
            }

            const config = getLlmConfig();

            // Generate Summary
            // Use 'analysis' model as it's typically faster/cheaper for this background task
            const summary = await aiSummaryService.generateBoardSummary(
                fullBoardData,
                fullBoardData.cards,
                { ...config, model: getRoleModel('analysis') }
            );

            if (summary && onUpdateBoardMetadata) {
                // console.log('[AutoSummary] Generated summary:', summary);
                await onUpdateBoardMetadata(candidate.id, { summary });
            }

        } catch (error) {
            console.error('[AutoSummary] Failed to auto-generate summary for', candidate.id, error);
        } finally {
            isProcessingRef.current = false;
            // Trigger next check immediately to process queue faster, 
            // but with a small delay to yield to UI
            setTimeout(processNextBoard, 1000);
        }
    };
}
