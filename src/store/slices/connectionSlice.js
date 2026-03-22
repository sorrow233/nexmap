import { getConnectedGraph } from '../../utils/graphUtils';
import { bumpBoardChangeState } from './utils/boardChangeState';

export const createConnectionSlice = (set, get) => ({
    connections: [],
    isConnecting: false,
    connectionStartId: null,

    setConnections: (connectionsOrUpdater, options = {}) => set((state) => ({
        connections: typeof connectionsOrUpdater === 'function' ? connectionsOrUpdater(state.connections) : connectionsOrUpdater,
        boardChangeState: options.changeType
            ? bumpBoardChangeState(state.boardChangeState, options.changeType)
            : state.boardChangeState
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
                        boardChangeState: bumpBoardChangeState(state.boardChangeState, 'connection_change'),
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

    // Reset connection state on logout
    resetConnectionState: () => set({
        connections: [],
        isConnecting: false,
        connectionStartId: null
    })
});
