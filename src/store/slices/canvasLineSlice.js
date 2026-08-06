import { uuid } from '../../utils/uuid';
import { normalizeCanvasLine, normalizeCanvasLines } from '../../utils/canvasLines';
import { bumpBoardChangeState } from './utils/boardChangeState';

export const createCanvasLineSlice = (set) => ({
    canvasLines: [],
    selectedCanvasLineId: null,

    setCanvasLines: (linesOrUpdater, options = {}) => set((state) => {
        const canvasLines = normalizeCanvasLines(
            typeof linesOrUpdater === 'function'
                ? linesOrUpdater(state.canvasLines)
                : linesOrUpdater
        );
        return {
            canvasLines,
            selectedCanvasLineId: canvasLines.some((line) => line.id === state.selectedCanvasLineId)
                ? state.selectedCanvasLineId
                : null,
            boardChangeState: options.changeType
                ? bumpBoardChangeState(state.boardChangeState, options.changeType)
                : state.boardChangeState
        };
    }),

    addCanvasLine: (line) => set((state) => ({
        canvasLines: [
            ...state.canvasLines,
            normalizeCanvasLine({ ...line, id: line?.id || uuid() })
        ],
        boardChangeState: bumpBoardChangeState(state.boardChangeState, 'canvas_line_change')
    })),

    deleteCanvasLine: (lineId) => set((state) => ({
        canvasLines: state.canvasLines.filter((line) => line.id !== lineId),
        selectedCanvasLineId: state.selectedCanvasLineId === lineId
            ? null
            : state.selectedCanvasLineId,
        boardChangeState: bumpBoardChangeState(state.boardChangeState, 'canvas_line_change')
    })),

    setSelectedCanvasLineId: (lineId) => set({
        selectedCanvasLineId: typeof lineId === 'string' && lineId ? lineId : null
    }),

    resetCanvasLineState: () => set({
        canvasLines: [],
        selectedCanvasLineId: null
    }, false, { skipBoardRuntime: true })
});
