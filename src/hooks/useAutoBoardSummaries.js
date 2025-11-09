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
                console.log('[AutoSummary] Generating TEXT summary for:', candidate.name);

                const { aiSummaryService } = await import('../services/aiSummaryService');
                const fullBoardData = await loadBoard(candidate.id);

                if (!fullBoardData || !fullBoardData.cards || fullBoardData.cards.length === 0) {
                    isProcessingRef.current = false;
                    return;
                }

                const config = getLlmConfig();
                const summary = await aiSummaryService.generateBoardSummary(
                    fullBoardData,
                    fullBoardData.cards,
                    { ...config, model: getRoleModel('analysis') }
                );

                if (summary && onUpdateBoardMetadata) {
                    await onUpdateBoardMetadata(candidate.id, { summary });
                }

            } else if (cardCount >= 10) {
                // Generate IMAGE background
                console.log('[AutoSummary] Generating IMAGE background for:', candidate.name);
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
