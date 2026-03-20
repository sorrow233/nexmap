import assert from 'node:assert/strict';
import {
  applyIncrementalPatchToBoard,
  buildIncrementalPatchCandidate
} from '../src/services/sync/boardIncrementalPatch.js';
import {
  applyBoardOperationEnvelope,
  buildBoardOperationEnvelope
} from '../src/services/localFirst/boardOperationEnvelope.js';
import {
  buildPatchDocumentId,
  buildSyncMutationMetadata,
  normalizeSyncMutationMetadata
} from '../src/services/sync/boardSyncProtocol.js';
import { rebaseBoardStateWithEnvelopes } from '../src/services/localFirst/boardRebaseCore.js';
import {
  buildBoardContentHash,
  normalizeBoardContentHash
} from '../src/services/boardPersistence/boardContentHash.js';

const createMemoryStorage = ({ throwOnSet = false } = {}) => {
  const map = new Map();

  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      if (throwOnSet) {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      }
      map.set(String(key), String(value));
    },
    removeItem(key) {
      map.delete(String(key));
    }
  };
};

const baseBoard = {
  cards: [
    {
      id: 'card-1',
      type: 'chat',
      x: 10,
      y: 20,
      data: {
        messages: [
          { id: 'm1', role: 'assistant', content: 'Hello' }
        ]
      }
    }
  ],
  connections: [{ from: 'card-1', to: 'card-2' }],
  groups: [{ id: 'group-1', title: 'Alpha', cardIds: ['card-1'] }],
  boardPrompts: [{ id: 'prompt-1', text: 'Old prompt' }],
  boardInstructionSettings: {
    enabledInstructionIds: ['old-id'],
    autoEnabledInstructionIds: [],
    autoSelectionMode: 'manual',
    autoSelection: {
      status: 'idle',
      lastRunAt: 0,
      lastConversationCount: 0,
      lastError: '',
      lastResultCount: 0,
      lastTrigger: 'manual'
    }
  },
  clientRevision: 7,
  mutationSequence: 3
};

const nextBoard = {
  cards: [
    {
      id: 'card-1',
      type: 'chat',
      x: 10,
      y: 20,
      data: {
        messages: [
          { id: 'm1', role: 'assistant', content: 'Hello world' }
        ]
      }
    },
    {
      id: 'card-2',
      type: 'note',
      x: 200,
      y: 120,
      data: { text: 'New node' }
    }
  ],
  connections: [
    { from: 'card-2', to: 'card-1' },
    { from: 'card-1', to: 'card-3' }
  ],
  groups: [{ id: 'group-1', title: 'Alpha 2', cardIds: ['card-1', 'card-2'] }],
  boardPrompts: [{ id: 'prompt-1', text: 'New prompt' }],
  boardInstructionSettings: {
    enabledInstructionIds: ['new-id'],
    autoEnabledInstructionIds: ['auto-id'],
    autoSelectionMode: 'manual',
    autoSelection: {
      status: 'done',
      lastRunAt: 123,
      lastConversationCount: 2,
      lastError: '',
      lastResultCount: 1,
      lastTrigger: 'auto'
    }
  },
  clientRevision: 8,
  mutationSequence: 4
};

const candidate = buildIncrementalPatchCandidate({
  baseBoard,
  nextBoard,
  fromClientRevision: 7,
  toClientRevision: 8,
  updatedAt: 1000
});

assert.equal(candidate.eligible, true, '结构化 patch 应该可生成');
assert.ok(candidate.patch.ops.some((op) => op.type === 'connection_upsert'));
assert.ok(candidate.patch.ops.some((op) => op.type === 'group_upsert'));
assert.ok(candidate.patch.ops.some((op) => op.type === 'board_prompt_upsert'));
assert.ok(candidate.patch.ops.some((op) => op.type === 'instruction_settings_set_enabled'));
assert.ok(candidate.patch.ops.some((op) => op.type === 'message_append'));
assert.ok(candidate.patch.ops.some((op) => op.type === 'card_upsert'));

const patchedBoard = applyIncrementalPatchToBoard(baseBoard, candidate.patch);
assert.deepEqual(patchedBoard.connections, [
  { from: 'card-1', to: 'card-2' },
  { from: 'card-1', to: 'card-3' }
]);
assert.equal(patchedBoard.groups[0].title, 'Alpha 2');
assert.equal(patchedBoard.boardPrompts[0].text, 'New prompt');
assert.deepEqual(patchedBoard.boardInstructionSettings.enabledInstructionIds, ['new-id']);
assert.equal(patchedBoard.cards[0].data.messages[0].content, 'Hello world');
assert.equal(patchedBoard.cards[1].id, 'card-2');

const envelope = buildBoardOperationEnvelope({
  boardId: 'board-1',
  actorId: 'actor-1',
  opId: 'actor-1:9:8',
  lamport: 9,
  createdAt: 1001,
  baseBoard,
  nextBoard,
  fromClientRevision: 7,
  toClientRevision: 8
});
assert.ok(envelope);
assert.ok(envelope.ops.every((op) => !String(op.type).includes('replace')));
const replayedBoard = applyBoardOperationEnvelope(baseBoard, envelope);
assert.equal(replayedBoard.cards[0].data.messages[0].content, 'Hello world');
assert.equal(replayedBoard.groups[0].title, 'Alpha 2');

const remoteBase = {
  ...baseBoard,
  cards: [
    {
      ...baseBoard.cards[0],
      data: {
        messages: [
          { id: 'm1', role: 'assistant', content: 'Remote hello' }
        ]
      }
    }
  ],
  clientRevision: 8,
  mutationSequence: 5
};
const rebaseResult = rebaseBoardStateWithEnvelopes(remoteBase, [envelope]);
assert.equal(rebaseResult.rebased, true);
assert.equal(rebaseResult.board.cards[0].data.messages[0].content, 'Remote hello world');
assert.equal(rebaseResult.board.cards[1].id, 'card-2');
assert.equal(rebaseResult.board.clientRevision, 8);

const syncMetadata = buildSyncMutationMetadata({
  mutationActorId: 'actor-1',
  mutationOpId: 'actor-1:9:8',
  mutationLamport: 9,
  ackedClientRevision: 7,
  ackedLamport: 8,
  pendingOperationCount: 1,
  mutationSequence: 12
});
const normalized = normalizeSyncMutationMetadata(syncMetadata);
assert.equal(normalized.mutationSequence, 12);
assert.equal(buildPatchDocumentId({
  mutationActorId: 'actor-1',
  mutationOpId: 'actor-1:9:8',
  mutationLamport: 9,
  toClientRevision: 8
}), '000000000008_000000000009_actor-1_actor-1_9_8');

const reversedOrderBoard = {
  ...nextBoard,
  cards: nextBoard.cards.slice().reverse(),
  connections: nextBoard.connections.slice().reverse(),
  groups: nextBoard.groups.slice().reverse(),
  boardPrompts: nextBoard.boardPrompts.slice().reverse()
};
const compactHash = buildBoardContentHash(nextBoard);
assert.ok(compactHash.startsWith('bh2_'));
assert.ok(compactHash.length < 80, 'contentHash 应该是短哈希，而不是完整快照');
assert.equal(compactHash, buildBoardContentHash(reversedOrderBoard), '顺序变化不应改变内容哈希');
assert.equal(
  normalizeBoardContentHash(JSON.stringify(nextBoard), nextBoard),
  compactHash,
  '旧的超长序列化 contentHash 应该被自愈为短哈希'
);

const sessionStorageMock = createMemoryStorage();
const localStorageMock = createMemoryStorage({ throwOnSet: true });
localStorageMock.removeItem = function removeItem(key) {
  this.__removedKeys = this.__removedKeys || [];
  this.__removedKeys.push(String(key));
};
const windowMock = {
  sessionStorage: sessionStorageMock,
  localStorage: localStorageMock
};

globalThis.window = windowMock;
globalThis.sessionStorage = sessionStorageMock;
globalThis.localStorage = localStorageMock;
delete globalThis.indexedDB;

const pendingCloudSyncModule = await import(`../src/services/pendingCloudSync.js?pending-cloud-sync-test=${Date.now()}`);
const pendingState = pendingCloudSyncModule.markPendingCloudSync('board-1', { reason: 'board_content_changed' });
assert.equal(pendingState.reason, 'board_content_changed');
assert.equal(
  sessionStorageMock.getItem('mixboard_pending_cloud_sync_board-1') !== null,
  true,
  '待同步标记应该在 sessionStorage 中成功写入'
);
assert.equal(
  pendingCloudSyncModule.hasPendingCloudSync('board-1'),
  true,
  'localStorage 爆配额时，待同步标记仍应可读'
);
pendingCloudSyncModule.clearPendingCloudSync('board-1');
assert.equal(pendingCloudSyncModule.hasPendingCloudSync('board-1'), false);

console.log('local-first sync regression checks passed');
