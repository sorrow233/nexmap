import {
    isMeaningfullyEmptyBoardSnapshot,
    normalizeBoardSnapshot
} from './boardSnapshot';

export const planDeferredRemoteCheckpointRepair = ({
    localSnapshot,
    remoteMetadata = {}
}) => {
    const normalizedLocalSnapshot = normalizeBoardSnapshot(localSnapshot);
    if (isMeaningfullyEmptyBoardSnapshot(normalizedLocalSnapshot)) {
        return { shouldRepair: false, reason: 'local_empty' };
    }

    if (!remoteMetadata?.hasCheckpoint) {
        return { shouldRepair: false, reason: 'remote_empty' };
    }

    const remoteRecoveredFromCompatibility = Boolean(remoteMetadata.recoveredFromCompatibility);

    if (remoteRecoveredFromCompatibility) {
        return {
            shouldRepair: true,
            reason: 'checkpoint_decode_repair'
        };
    }

    return { shouldRepair: false, reason: 'remote_up_to_date' };
};
