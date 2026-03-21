import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { loadBoardDataForSearch } from '../services/storage';
import { loadBoardsSearchData } from '../services/search/searchDataLoader';

const SEARCH_DATA_FLUSH_DELAY_MS = 80;

export function useGlobalBoardSearch({ boardsList }) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [allBoardsData, setAllBoardsData] = useState({});
    const [searchLoadState, setSearchLoadState] = useState({
        isLoading: false,
        loadedCount: 0,
        totalCount: 0
    });
    const allBoardsDataRef = useRef(allBoardsData);
    const searchLoadTokenRef = useRef(0);
    const searchBufferedDataRef = useRef({});
    const searchFlushTimerRef = useRef(null);

    useSearchShortcut(useCallback(() => setIsSearchOpen(true), []));

    useEffect(() => {
        allBoardsDataRef.current = allBoardsData;
    }, [allBoardsData]);

    const flushSearchDataBuffer = useCallback(() => {
        const pendingChunk = searchBufferedDataRef.current;
        if (Object.keys(pendingChunk).length === 0) return;

        searchBufferedDataRef.current = {};
        setAllBoardsData(prev => ({ ...prev, ...pendingChunk }));
    }, []);

    const queueSearchDataChunk = useCallback((boardId, data) => {
        searchBufferedDataRef.current[boardId] = data;
        if (searchFlushTimerRef.current) return;

        searchFlushTimerRef.current = setTimeout(() => {
            searchFlushTimerRef.current = null;
            flushSearchDataBuffer();
        }, SEARCH_DATA_FLUSH_DELAY_MS);
    }, [flushSearchDataBuffer]);

    useEffect(() => {
        return () => {
            if (searchFlushTimerRef.current) {
                clearTimeout(searchFlushTimerRef.current);
                searchFlushTimerRef.current = null;
            }
            flushSearchDataBuffer();
        };
    }, [flushSearchDataBuffer]);

    useEffect(() => {
        if (!isSearchOpen) return;

        const existingBoardIds = new Set(
            boardsList
                .filter(board => Object.prototype.hasOwnProperty.call(allBoardsDataRef.current, board.id))
                .map(board => board.id)
        );
        const totalCount = boardsList.length;
        const missingCount = boardsList.filter(board => (
            board?.id && !existingBoardIds.has(board.id)
        )).length;

        if (missingCount === 0) {
            setSearchLoadState({
                isLoading: false,
                loadedCount: existingBoardIds.size,
                totalCount
            });
            return;
        }

        const loadToken = searchLoadTokenRef.current + 1;
        searchLoadTokenRef.current = loadToken;
        let loadedDelta = 0;

        setSearchLoadState({
            isLoading: true,
            loadedCount: existingBoardIds.size,
            totalCount
        });

        void loadBoardsSearchData({
            boards: boardsList,
            loadBoardData: loadBoardDataForSearch,
            existingBoardIds,
            shouldCancel: () => searchLoadTokenRef.current !== loadToken || !isSearchOpen,
            onBoardLoaded: (boardId, data) => {
                if (searchLoadTokenRef.current !== loadToken || !isSearchOpen) return;
                loadedDelta += 1;
                queueSearchDataChunk(boardId, data);
                setSearchLoadState({
                    isLoading: true,
                    loadedCount: existingBoardIds.size + loadedDelta,
                    totalCount
                });
            }
        }).finally(() => {
            if (searchLoadTokenRef.current !== loadToken || !isSearchOpen) return;

            flushSearchDataBuffer();
            setSearchLoadState({
                isLoading: false,
                loadedCount: existingBoardIds.size + loadedDelta,
                totalCount
            });
        });

        return () => {
            if (searchLoadTokenRef.current === loadToken) {
                searchLoadTokenRef.current += 1;
            }
            if (searchFlushTimerRef.current) {
                clearTimeout(searchFlushTimerRef.current);
                searchFlushTimerRef.current = null;
            }
            flushSearchDataBuffer();
        };
    }, [isSearchOpen, boardsList, queueSearchDataChunk, flushSearchDataBuffer]);

    return {
        isSearchOpen,
        setIsSearchOpen,
        allBoardsData,
        searchLoadState
    };
}
