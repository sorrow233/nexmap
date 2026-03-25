let activeBoardRuntime = null;

export const registerActiveBoardRuntime = ({ boardId, controller } = {}) => {
    if (!boardId || !controller) {
        activeBoardRuntime = null;
        return;
    }

    activeBoardRuntime = {
        boardId,
        controller,
        largeBoardMode: controller?.largeBoardMode === true
    };
};

export const unregisterActiveBoardRuntime = ({ boardId, controller } = {}) => {
    if (!activeBoardRuntime) return;

    if (boardId && activeBoardRuntime.boardId !== boardId) {
        return;
    }

    if (controller && activeBoardRuntime.controller !== controller) {
        return;
    }

    activeBoardRuntime = null;
};

export const isActiveBoardRuntimeController = (boardId, controller) => (
    Boolean(
        activeBoardRuntime &&
        activeBoardRuntime.boardId === boardId &&
        activeBoardRuntime.controller === controller
    )
);

export const getActiveBoardRuntimeState = (boardId, controller) => {
    if (!isActiveBoardRuntimeController(boardId, controller)) {
        return null;
    }

    return {
        boardId: activeBoardRuntime.boardId,
        controller: activeBoardRuntime.controller,
        largeBoardMode: activeBoardRuntime.largeBoardMode === true
    };
};
