import { uuid } from '../../utils/uuid';

export const createGroupSlice = (set, get) => ({
    groups: [],

    setGroups: (valOrUpdater) => set((state) => ({
        groups: typeof valOrUpdater === 'function' ? valOrUpdater(state.groups) : valOrUpdater
    })),

    // --- Group Actions ---
    createGroup: (cardIds, title = 'New Zone') => set(state => {
        const newGroup = {
            id: uuid(),
            title,
            cardIds,
            color: 'blue' // Default color
        };
        return {
            groups: [...state.groups, newGroup],
            selectedIds: [] // Deselect cards after grouping
        };
    }),

    updateGroup: (id, updater) => set(state => ({
        groups: state.groups.map(g => g.id === id ? { ...g, ...updater } : g)
    })),

    deleteGroup: (id) => set(state => ({
        groups: state.groups.filter(g => g.id !== id)
    })),
});
