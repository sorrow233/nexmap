import { normalizeBoardSnapshot } from '../boardSnapshot';
import {
    buildBodySyncSnapshotFromEntries,
    buildCardBodySyncEntries,
    mergeCardBodyEntriesIntoSnapshot
} from './cardBodySyncProtocol';

const BODY_CHANGE_TYPES = new Set([
    'card_body_content'
]);

export const isBodySyncChangeType = (changeType = '') => BODY_CHANGE_TYPES.has(changeType);

export const buildBodySyncSnapshot = ({
    cards = [],
    clientRevision = 0,
    updatedAt = 0
} = {}, options = {}) => buildBodySyncSnapshotFromEntries(
    buildCardBodySyncEntries(
        Array.isArray(options.cardIds) && options.cardIds.length > 0
            ? cards.filter((card) => options.cardIds.includes(card?.id))
            : cards,
        { clientRevision, updatedAt }
    ),
    {
        clientRevision,
        updatedAt
    }
);

export const mergeBodySnapshot = (currentSnapshot = {}, incomingSnapshot = {}) => {
    const incoming = normalizeBoardSnapshot(incomingSnapshot);
    return mergeCardBodyEntriesIntoSnapshot(currentSnapshot, buildCardBodySyncEntries(
        incoming.cards,
        {
            clientRevision: incoming.clientRevision,
            updatedAt: incoming.updatedAt
        }
    ));
};

export const buildBodySyncEntriesFromSnapshot = ({
    cards = [],
    clientRevision,
    updatedAt
} = {}) => buildCardBodySyncEntries(cards, { clientRevision, updatedAt });
