import assert from 'node:assert/strict';
import {
    readCardClipboardForPasteAsync,
    resetCardClipboardForTests,
    writeCardClipboard
} from '../src/services/cardClipboardService.js';
import { isCardPasteTargetReady } from '../src/services/cardPasteCoordinator.js';
import { buildPastedCardBatch } from '../src/utils/cardPasteLayout.js';

const sourceCards = [
    {
        id: 'source-1',
        x: 100,
        y: 200,
        data: {
            title: '第一张卡片',
            messages: [{ id: 'm1', role: 'user', content: '完整正文一' }],
            runtimeBodyState: { hydrated: true, estimatedChars: 100 }
        }
    },
    {
        id: 'source-2',
        x: 460,
        y: 320,
        data: {
            title: '第二张卡片',
            messages: [{ id: 'm2', role: 'assistant', content: '完整正文二' }]
        }
    },
    {
        id: 'source-3',
        x: 220,
        y: 680,
        data: {
            title: '第三张卡片',
            messages: [{ id: 'm3', role: 'user', content: '完整正文三' }]
        }
    }
];

const storageValues = new Map();
const storage = {
    getItem: (key) => storageValues.get(key) || null,
    removeItem: (key) => storageValues.delete(key),
    setItem: (key, value) => storageValues.set(key, value)
};
globalThis.window = { localStorage: storage, sessionStorage: storage };

resetCardClipboardForTests();
assert.equal(writeCardClipboard(sourceCards, { sourceBoardId: 'board-a' }), 3);
resetCardClipboardForTests();
const clipboardPayload = await readCardClipboardForPasteAsync();
assert.equal(clipboardPayload.sourceBoardId, 'board-a');
assert.equal(clipboardPayload.cards.length, 3);
assert.equal(clipboardPayload.cards[0].data.runtimeBodyState, undefined);

let nextId = 0;
const pastedCards = buildPastedCardBatch({
    clipboardCards: clipboardPayload.cards,
    offset: { x: 100, y: 50 },
    scale: 1,
    viewportWidth: 1400,
    viewportHeight: 900,
    currentPasteSequence: clipboardPayload.pasteSequence,
    createId: () => `pasted-${++nextId}`
});

assert.deepEqual(pastedCards.map((card) => card.id), ['pasted-1', 'pasted-2', 'pasted-3']);
assert.equal(pastedCards[1].x - pastedCards[0].x, 344);
assert.equal(pastedCards[2].x - pastedCards[1].x, 344);
assert.equal(pastedCards[0].y, pastedCards[1].y);
assert.notEqual(
    pastedCards[1].x - pastedCards[0].x,
    sourceCards[1].x - sourceCards[0].x,
    '粘贴布局不能继承源画布坐标关系'
);
const pastedLeft = Math.min(...pastedCards.map((card) => card.x));
const pastedRight = Math.max(...pastedCards.map((card) => card.x + 320));
const pastedTop = Math.min(...pastedCards.map((card) => card.y));
const pastedBottom = Math.max(...pastedCards.map((card) => card.y + 300));
assert.equal((pastedLeft + pastedRight) / 2 + 100, 1400 / 2, '卡片组应落在屏幕水平中心');
assert.equal((pastedTop + pastedBottom) / 2 + 50, 900 / 2, '卡片组应落在屏幕垂直中心');
assert.equal(pastedCards[0].data.messages[0].content, '完整正文一');
assert.equal(sourceCards[0].id, 'source-1', '复制源卡片不能被修改');

const secondPaste = await readCardClipboardForPasteAsync();
assert.equal(secondPaste.pasteSequence, 1, '重复粘贴应产生可见偏移');

assert.equal(isCardPasteTargetReady({
    targetBoardId: 'board-b',
    activeBoardId: 'board-a',
    isBoardLoading: true
}), false, '目标画布加载期间必须延迟粘贴');
assert.equal(isCardPasteTargetReady({
    targetBoardId: 'board-b',
    activeBoardId: 'board-b',
    isBoardLoading: false
}), true, '目标画布完成加载后才能执行粘贴');

delete globalThis.window;

console.log('Cross-board card clipboard tests passed.');
