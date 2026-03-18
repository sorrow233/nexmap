const DEFAULT_SEARCH_LOAD_CONCURRENCY = 3;

export async function loadBoardsSearchData({
    boards = [],
    loadBoardData,
    existingBoardIds = new Set(),
    concurrency = DEFAULT_SEARCH_LOAD_CONCURRENCY,
    shouldCancel = () => false,
    onBoardLoaded = () => { }
}) {
    if (typeof loadBoardData !== 'function') {
        throw new Error('loadBoardData must be a function');
    }

    const pendingBoards = boards.filter(board => (
        board?.id &&
        !existingBoardIds.has(board.id)
    ));

    if (pendingBoards.length === 0) {
        return { total: 0, loaded: 0 };
    }

    let cursor = 0;

    const worker = async () => {
        while (!shouldCancel()) {
            const board = pendingBoards[cursor];
            cursor += 1;

            if (!board) return;

            try {
                const data = await loadBoardData(board.id);
                if (data && !shouldCancel()) {
                    onBoardLoaded(board.id, data);
                }
            } catch (error) {
                console.warn('Failed to load board data for search:', board.id, error);
            }
        }
    };

    const workerCount = Math.min(concurrency, pendingBoards.length);
    await Promise.all(
        Array.from({ length: workerCount }, () => worker())
    );

    return {
        total: pendingBoards.length,
        loaded: pendingBoards.length
    };
}
