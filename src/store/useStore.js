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
    BOARD_RUNTIME_KEYS,
    commitActiveBoardRuntimePatch,
    commitActiveBoardRuntimeSnapshot,
    getActiveBoardRuntimeBoardId,
    getBoardRuntimeStoreWriteScope,
    hasActiveBoardRuntime,
    hasBoardRuntimePatch,
    withBoardRuntimeStoreWriteScope
} from '../services/sync/boardRuntimeAuthority';


// --- Global Store with Temporal Middleware ---

const useStoreBase = create(
    temporal(
        (rawSet, get) => {
            const set = (partial, replace, meta = {}) => {
                if (replace === true || meta?.skipBoardRuntime) {
                    return rawSet(partial, replace);
                }

                const currentState = get();
                const nextPartial = typeof partial === 'function'
                    ? partial(currentState)
                    : partial;

                if (nextPartial === currentState) {
                    return currentState;
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

                const finalPatch = { ...nextPartial };
                Object.keys(runtimeResult.boardPatch).forEach((key) => {
                    delete finalPatch[key];
                });
                delete finalPatch.cardIndexMutation;
                delete finalPatch.boardChangeState;

                if (Object.keys(finalPatch).length === 0) {
                    return currentState;
                }

                const setResult = rawSet(finalPatch, replace);
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

                // Global reset for logout
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
            limit: 50,
            equality: (a, b) => (
                a.cards === b.cards &&
                a.connections === b.connections &&
                a.groups === b.groups &&
                a.boardPrompts === b.boardPrompts &&
                a.boardInstructionSettings === b.boardInstructionSettings
            ),
            partialize: (state) => ({
                cards: state.cards,
                connections: state.connections,
                groups: state.groups, // Persist groups
                boardPrompts: state.boardPrompts, // Persist board prompts
                boardInstructionSettings: state.boardInstructionSettings
            })
        }
    )
    );


const reconcileBoardStateAfterHistoryAction = (changeType) => {
    const currentState = useStoreBase.getState();
    const integrityHash = buildBoardChangeIntegrityHash({
        cards: currentState.cards,
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
        cards: currentState.cards,
        connections: currentState.connections,
        groups: currentState.groups,
        boardPrompts: currentState.boardPrompts,
        boardInstructionSettings: currentState.boardInstructionSettings
    });
    useStoreBase.getState().rebuildCardLookup?.(
        runtimeResult?.boardPatch?.cards || currentState.cards
    );
};



export const useStore = useStoreBase;

// Expose store to window for debugging
if (typeof window !== 'undefined') {
    window.useStore = useStoreBase;
}

// Correctly implement useTemporalStore using useStoreWithEqualityFn
export function useTemporalStore(selector, equality) {
    return useStoreWithEqualityFn(useStoreBase.temporal, selector, equality);
}

export const undo = () => {
    const temporalState = useStoreBase.temporal.getState();
    if (!temporalState.pastStates?.length) {
        return;
    }

    withBoardRuntimeStoreWriteScope('authority_bootstrap', () => {
        temporalState.undo();
    });
    reconcileBoardStateAfterHistoryAction('undo');
};

export const redo = () => {
    const temporalState = useStoreBase.temporal.getState();
    if (!temporalState.futureStates?.length) {
        return;
    }

    withBoardRuntimeStoreWriteScope('authority_bootstrap', () => {
        temporalState.redo();
    });
    reconcileBoardStateAfterHistoryAction('redo');
};

export const clearHistory = () => useStoreBase.temporal.getState().clear();

if (import.meta.env.DEV) {
    useStoreBase.subscribe((nextState, previousState) => {
        if (!hasActiveBoardRuntime()) {
            return;
        }

        const changedRuntimeKeys = BOARD_RUNTIME_KEYS.filter((key) => (
            nextState[key] !== previousState[key]
        ));
        if (changedRuntimeKeys.length === 0) {
            return;
        }

        const source = getBoardRuntimeStoreWriteScope();
        if (source === 'authority_observe' || source === 'authority_bootstrap') {
            return;
        }

        console.warn('[BoardRuntimeAuthority] Detected runtime field write outside Y.Doc authority', {
            boardId: getActiveBoardRuntimeBoardId(),
            changedRuntimeKeys,
            source: source || 'unknown'
        });
    });
}
