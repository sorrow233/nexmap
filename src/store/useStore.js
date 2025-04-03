import { create } from 'zustand';
import { temporal } from 'zundo';
import { useStoreWithEqualityFn } from 'zustand/traditional';

import { createCanvasSlice } from './slices/canvasSlice';
import { createContentSlice } from './slices/contentSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createShareSlice } from './slices/shareSlice';

// --- Global Store with Temporal Middleware ---

const useStoreBase = create(
    temporal(
        (set, get) => ({
            ...createCanvasSlice(set, get),
            ...createContentSlice(set, get),
            ...createSettingsSlice(set, get),
            ...createShareSlice(set, get)
        }),
        {
            limit: 50,
            equality: (a, b) => a.cards === b.cards && a.connections === b.connections,
            partialize: (state) => ({
                cards: state.cards,
                connections: state.connections
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
