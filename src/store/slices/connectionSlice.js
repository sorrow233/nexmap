import { getConnectedGraph } from '../../utils/graphUtils';

export const createConnectionSlice = (set, get) => ({
    connections: [],
    isConnecting: false,
    connectionStartId: null,

    setConnections: (connectionsOrUpdater) => set((state) => ({
        connections: typeof connectionsOrUpdater === 'function' ? connectionsOrUpdater(state.connections) : connectionsOrUpdater
    })),

    handleConnect: (targetId) => {
        const { isConnecting, connectionStartId, connections } = get();
        if (isConnecting && connectionStartId) {
            if (connectionStartId !== targetId) {
                const exists = connections.some(c =>
                    (c.from === connectionStartId && c.to === targetId) ||
                    (c.from === targetId && c.to === connectionStartId)
                );

                if (!exists) {
                    set(state => ({
                        connections: [...state.connections, { from: connectionStartId, to: targetId }],
                        isConnecting: false,
                        connectionStartId: null
                    }));

                    // Trigger zone update based on connection
                    setTimeout(() => {
                        get().addConnectedCardsToZone?.(connectionStartId, targetId);
                    }, 50);

                    localStorage.setItem('hasUsedConnections', 'true');
                    return;
                }
            }
            set({ isConnecting: false, connectionStartId: null });
        } else {
            set({ isConnecting: true, connectionStartId: targetId });
        }
    },

    // Helper to get connected network (moved from handleCardMove to be exposed)
    getConnectedCards: (startId) => {
        const { connections } = get();
        return Array.from(getConnectedGraph(startId, connections));
    },
});
