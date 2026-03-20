import { applyBoardOperationEnvelope } from './boardOperationEnvelope.js';

const toSafeInt = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : fallback;
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeBoardState = (board = {}) => ({
    ...board,
    cards: safeArray(board.cards),
    connections: safeArray(board.connections),
    groups: safeArray(board.groups),
    boardPrompts: safeArray(board.boardPrompts)
});

export const rebaseBoardStateWithEnvelopes = (baseBoard = {}, envelopes = []) => {
    const normalizedBase = normalizeBoardState(baseBoard);
    const normalizedEnvelopes = safeArray(envelopes)
        .filter((envelope) => envelope && typeof envelope === 'object')
        .sort((left, right) => {
            const revisionDelta = toSafeInt(left.toClientRevision) - toSafeInt(right.toClientRevision);
            if (revisionDelta !== 0) return revisionDelta;
            return toSafeInt(left.lamport) - toSafeInt(right.lamport);
        });

    if (normalizedEnvelopes.length === 0) {
        return {
            board: normalizedBase,
            rebased: false,
            latestEnvelope: null,
            pendingOperationCount: 0
        };
    }

    const rebasedBoard = normalizedEnvelopes.reduce((draft, envelope) => {
        const nextBoard = applyBoardOperationEnvelope(draft, envelope);
        return {
            ...draft,
            ...nextBoard,
            updatedAt: Math.max(toSafeInt(draft.updatedAt), toSafeInt(envelope.createdAt)),
            clientRevision: Math.max(toSafeInt(draft.clientRevision), toSafeInt(envelope.toClientRevision))
        };
    }, normalizedBase);

    return {
        board: rebasedBoard,
        rebased: true,
        latestEnvelope: normalizedEnvelopes[normalizedEnvelopes.length - 1],
        pendingOperationCount: normalizedEnvelopes.length
    };
};
