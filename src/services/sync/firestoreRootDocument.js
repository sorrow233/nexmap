import { deleteField } from 'firebase/firestore';

const CURRENT_SYNC_BACKEND = 'yjs-firestore-v1';

const LEGACY_ROOT_FIELDS = [
    'cards',
    'connections',
    'groups',
    'boardPrompts',
    'boardInstructionSettings',
    'snapshotData',
    'snapshotEncoding',
    'snapshotSchemaVersion',
    'snapshotStorage',
    'snapshotSetId',
    'snapshotChunkCount',
    'snapshotBytes',
    'contentHash',
    'syncVersion',
    'checkpointUpdatedAt',
    'checkpointClientRevision',
    'patchHeadClientRevision',
    'patchUpdatedAt',
    'patchOpCount',
    'patchSinceCheckpoint'
];

export const buildAuthoritativeRootPayload = (payload = {}) => {
    const cleanedPayload = {
        syncBackend: CURRENT_SYNC_BACKEND,
        ...payload
    };

    LEGACY_ROOT_FIELDS.forEach((fieldName) => {
        if (!(fieldName in cleanedPayload)) {
            cleanedPayload[fieldName] = deleteField();
        }
    });

    return cleanedPayload;
};
