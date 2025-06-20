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


// --- Global Store with Temporal Middleware ---

const useStoreBase = create(
    temporal(
        (set, get) => ({
            ...createCanvasSlice(set, get),
            ...createCardSlice(set, get),
            ...createConnectionSlice(set, get),
            ...createGroupSlice(set, get),
            ...createSelectionSlice(set, get),
            ...createAISlice(set, get),
            ...createSettingsSlice(set, get),
            ...createShareSlice(set, get),
            ...createCreditsSlice(set, get),

            // Global reset for logout
            resetAllState: () => {
                console.log('[Store] Resetting all state...');
                get().resetCardState?.();
                get().resetConnectionState?.();
                get().resetGroupState?.();
                get().resetSettingsState?.();
                get().resetCreditsState?.();
                console.log('[Store] All state reset complete');
            }
        }),
        {
            limit: 50,
            equality: (a, b) => a.cards === b.cards && a.connections === b.connections,
            partialize: (state) => ({
                cards: state.cards,
                connections: state.connections,
                groups: state.groups // Persist groups
            })
        }
    )
);



export const useStore = useStoreBase;

// Correctly implement useTemporalStore using useStoreWithEqualityFn
export function useTemporalStore(selector, equality) {
    return useStoreWithEqualityFn(useStoreBase.temporal, selector, equality);
}

export const { undo, redo, clear: clearHistory } = useStoreBase.temporal.getState();
