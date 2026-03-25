import { create } from 'zustand';
import { temporal } from 'zundo';
import { useStoreWithEqualityFn } from 'zustand/traditional';

import { createCanvasSlice } from './slices/canvasSlice';
import { createCardSlice } from './slices/cardSlice';
import { createConnectionSlice } from './slices/connectionSlice';
import { createGroupSlice } from './slices/groupSlice';
import { createSelectionSlice } from './slices/selectionSlice';
import { createAISlice } from './slices/aiSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createShareSlice } from './slices/shareSlice';
import { createCreditsSlice } from './slices/creditsSlice';
import { createBoardSlice } from './slices/boardSlice';
import { nextCardIndexMutation } from './slices/utils/cardIndexMutation';
import {
    bumpBoardChangeState,
    markBoardChangeStateValidated
} from './slices/utils/boardChangeState';
import { buildBoardChangeIntegrityHash } from './slices/utils/boardChangeIntegrity';
import {
    commitActiveBoardRuntimePatch,
    commitActiveBoardRuntimeSnapshot,
    hasBoardRuntimePatch
} from '../services/sync/boardRuntimeAuthority';
import {
    buildHistoryCardsForRuntime,
    mergeRuntimeCardBodies
} from '../services/cardBodyRuntimeCache';
import {
    isLargeBoardCards,
    resolveBoardHistoryLimit
} from '../utils/boardPerformance';

const DEFAULT_HISTORY_DEBOUNCE_MS = 180;
const CARD_CONTENT_HISTORY_DEBOUNCE_MS = 900;
const CARD_MOVE_HISTORY_DEBOUNCE_MS = 320;

const temporalApiRef = { current: null };
const historyHandleSetRef = { current: null };
const historyControlRef = {
    pausedDepth: 0,
    behavior: {
        skip: false,
        maxEntries: 12,
        debounceMs: DEFAULT_HISTORY_DEBOUNCE_MS
    },
    debounceTimer: null,
    pendingEntry: null
};

const cancelPendingHistoryCommit = () => {
    if (historyControlRef.debounceTimer) {
        clearTimeout(historyControlRef.debounceTimer);
        historyControlRef.debounceTimer = null;
    }
    historyControlRef.pendingEntry = null;
};

const trimTemporalHistory = (maxEntries) => {
    if (!Number.isFinite(maxEntries) || maxEntries < 0) {
        return;
    }

    const temporalApi = temporalApiRef.current;
    if (!temporalApi) {
        return;
    }

    const temporalState = temporalApi.getState();
    const nextPastStates = temporalState.pastStates.length > maxEntries
        ? temporalState.pastStates.slice(-maxEntries)
        : temporalState.pastStates;
    const nextFutureStates = temporalState.futureStates.length > maxEntries
        ? temporalState.futureStates.slice(-maxEntries)
        : temporalState.futureStates;

    if (
        nextPastStates !== temporalState.pastStates ||
        nextFutureStates !== temporalState.futureStates
    ) {
        temporalApi.setState({
            pastStates: nextPastStates,
            futureStates: nextFutureStates
        });
    }
};

const flushPendingHistoryCommit = () => {
    const baseHandleSet = historyHandleSetRef.current;
    const pendingEntry = historyControlRef.pendingEntry;
    if (!baseHandleSet || !pendingEntry) {
        return;
    }

    historyControlRef.pendingEntry = null;
    if (historyControlRef.debounceTimer) {
        clearTimeout(historyControlRef.debounceTimer);
        historyControlRef.debounceTimer = null;
    }

    baseHandleSet(
        pendingEntry.pastState,
        pendingEntry.replace,
        pendingEntry.currentState,
        undefined
    );
    trimTemporalHistory(pendingEntry.maxEntries);
};

const setHistoryBehavior = (behavior = {}) => {
    historyControlRef.behavior = {
        skip: behavior.skip === true,
        maxEntries: Number.isFinite(behavior.maxEntries) ? behavior.maxEntries : 12,
        debounceMs: Number.isFinite(behavior.debounceMs) ? behavior.debounceMs : DEFAULT_HISTORY_DEBOUNCE_MS
    };

    if (historyControlRef.behavior.skip) {
        cancelPendingHistoryCommit();
    }
};

const resolveHistoryBehavior = (currentState, nextPartial, replace = false, meta = {}) => {
    if (replace === true || meta?.skipHistory) {
        return {
            skip: true,
            maxEntries: 0,
            debounceMs: 0
        };
    }

    const nextCards = Array.isArray(nextPartial?.cards) ? nextPartial.cards : currentState.cards || [];
    const largeBoard = isLargeBoardCards(nextCards);
    const changeType = nextPartial?.boardChangeState?.lastChangeType || meta?.changeType || '';

    let debounceMs = DEFAULT_HISTORY_DEBOUNCE_MS;
    if (largeBoard && changeType === 'card_body_content') {
        return {
            skip: true,
            maxEntries: 0,
            debounceMs: 0
        };
    }

    if (changeType === 'card_content' || changeType === 'card_body_content') {
        debounceMs = CARD_CONTENT_HISTORY_DEBOUNCE_MS;
    } else if (changeType === 'card_move') {
        debounceMs = CARD_MOVE_HISTORY_DEBOUNCE_MS;
    }

    if (largeBoard) {
        debounceMs = Math.max(debounceMs, 260);
    }

    return {
        skip: false,
        maxEntries: resolveBoardHistoryLimit(nextCards),
        debounceMs
    };
};

const useStoreBase = create(
    temporal(
        (rawSet, get) => {
            const set = (partial, replace, meta = {}) => {
                const currentState = get();
                const nextPartial = typeof partial === 'function'
                    ? partial(currentState)
                    : partial;

                if (nextPartial === currentState) {
                    return currentState;
                }

                setHistoryBehavior(resolveHistoryBehavior(currentState, nextPartial, replace, meta));

                if (replace === true || meta?.skipBoardRuntime) {
                    return rawSet(nextPartial, replace);
                }

                if (
                    !nextPartial ||
                    typeof nextPartial !== 'object' ||
                    !hasBoardRuntimePatch(nextPartial)
                ) {
                    return rawSet(nextPartial, replace);
                }

                const runtimeResult = commitActiveBoardRuntimePatch(nextPartial);
                if (!runtimeResult?.boardPatch) {
                    return rawSet(nextPartial, replace);
                }

                const finalPatch = {
                    ...nextPartial,
                    ...runtimeResult.boardPatch
                };
                const setResult = rawSet(finalPatch, replace);

                if (Object.prototype.hasOwnProperty.call(runtimeResult.boardPatch, 'cards')) {
                    get().rebuildCardLookup?.(runtimeResult.boardPatch.cards || []);
                }

                return setResult;
            };

            return {
                ...createCanvasSlice(set, get),
                ...createCardSlice(set, get),
                ...createConnectionSlice(set, get),
                ...createGroupSlice(set, get),
                ...createSelectionSlice(set, get),
                ...createAISlice(set, get),
                ...createSettingsSlice(set, get),
                ...createShareSlice(set, get),
                ...createCreditsSlice(set, get),
                ...createBoardSlice(set, get),

                resetAllState: () => {
                    console.log('[Store] Resetting all state...');
                    get().clearStreamingState?.();
                    get().resetGeneratingState?.();
                    get().resetCardState?.();
                    get().resetConnectionState?.();
                    get().resetGroupState?.();
                    get().resetSettingsState?.();
                    get().resetCreditsState?.();
                    console.log('[Store] All state reset complete');
                }
            };
        },
        {
            limit: 12,
            equality: (a, b) => (
                a.cards === b.cards &&
                a.connections === b.connections &&
                a.groups === b.groups &&
                a.boardPrompts === b.boardPrompts &&
                a.boardInstructionSettings === b.boardInstructionSettings
            ),
            handleSet: (baseHandleSet) => {
                historyHandleSetRef.current = baseHandleSet;

                return (pastState, replace, currentState) => {
                    const behavior = historyControlRef.behavior;
                    if (historyControlRef.pausedDepth > 0 || behavior.skip) {
                        return;
                    }

                    const commitEntry = {
                        pastState,
                        replace,
                        currentState,
                        maxEntries: behavior.maxEntries
                    };

                    if (behavior.debounceMs > 0) {
                        if (!historyControlRef.pendingEntry) {
                            historyControlRef.pendingEntry = commitEntry;
                        } else {
                            historyControlRef.pendingEntry = {
                                ...historyControlRef.pendingEntry,
                                currentState,
                                replace,
                                maxEntries: behavior.maxEntries
                            };
                        }

                        if (historyControlRef.debounceTimer) {
                            clearTimeout(historyControlRef.debounceTimer);
                        }

                        historyControlRef.debounceTimer = setTimeout(() => {
                            flushPendingHistoryCommit();
                        }, behavior.debounceMs);
                        return;
                    }

                    flushPendingHistoryCommit();
                    baseHandleSet(pastState, replace, currentState, undefined);
                    trimTemporalHistory(behavior.maxEntries);
                };
            },
            partialize: (state) => ({
                cards: buildHistoryCardsForRuntime(state.cards),
                connections: state.connections,
                groups: state.groups,
                boardPrompts: state.boardPrompts,
                boardInstructionSettings: state.boardInstructionSettings
            })
        }
    )
);

temporalApiRef.current = useStoreBase.temporal;

const reconcileBoardStateAfterHistoryAction = (changeType) => {
    const currentState = useStoreBase.getState();
    const mergedCards = mergeRuntimeCardBodies(currentState.cards);
    const integrityHash = buildBoardChangeIntegrityHash({
        cards: mergedCards,
        connections: currentState.connections,
        groups: currentState.groups,
        boardPrompts: currentState.boardPrompts,
        boardInstructionSettings: currentState.boardInstructionSettings
    });
    const nextBoardChangeState = markBoardChangeStateValidated(
        bumpBoardChangeState(currentState.boardChangeState, changeType, {
            changedAt: Date.now()
        }),
        {
            integrityHash,
            validatedAt: Date.now()
        }
    );

    useStoreBase.setState({
        boardChangeState: nextBoardChangeState,
        cardIndexMutation: nextCardIndexMutation(currentState.cardIndexMutation, {
            mode: 'bulk',
            reason: `temporal:${changeType}`
        })
    });

    const runtimeResult = commitActiveBoardRuntimeSnapshot({
        cards: mergedCards,
        connections: currentState.connections,
        groups: currentState.groups,
        boardPrompts: currentState.boardPrompts,
        boardInstructionSettings: currentState.boardInstructionSettings
    });
    if (runtimeResult?.boardPatch) {
        useStoreBase.setState(runtimeResult.boardPatch);
    }

    useStoreBase.getState().rebuildCardLookup?.(
        runtimeResult?.boardPatch?.cards || currentState.cards
    );
};

export const useStore = useStoreBase;

if (typeof window !== 'undefined') {
    window.useStore = useStoreBase;
}

export function useTemporalStore(selector, equality) {
    return useStoreWithEqualityFn(useStoreBase.temporal, selector, equality);
}

export const pauseHistoryTracking = () => {
    historyControlRef.pausedDepth += 1;
    cancelPendingHistoryCommit();
    useStoreBase.temporal.getState().pause();
};

export const resumeHistoryTracking = () => {
    historyControlRef.pausedDepth = Math.max(0, historyControlRef.pausedDepth - 1);
    if (historyControlRef.pausedDepth === 0) {
        useStoreBase.temporal.getState().resume();
    }
};

export const runWithoutHistory = (callback) => {
    pauseHistoryTracking();
    try {
        return callback();
    } finally {
        resumeHistoryTracking();
    }
};

export const undo = () => {
    flushPendingHistoryCommit();
    const temporalState = useStoreBase.temporal.getState();
    if (!temporalState.pastStates?.length) {
        return;
    }

    temporalState.undo();
    reconcileBoardStateAfterHistoryAction('undo');
};

export const redo = () => {
    flushPendingHistoryCommit();
    const temporalState = useStoreBase.temporal.getState();
    if (!temporalState.futureStates?.length) {
        return;
    }

    temporalState.redo();
    reconcileBoardStateAfterHistoryAction('redo');
};

export const clearHistory = () => {
    cancelPendingHistoryCommit();
    return useStoreBase.temporal.getState().clear();
};
