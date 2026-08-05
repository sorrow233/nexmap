import assert from 'node:assert/strict';
import {
    buildPastedCardBatch,
    readCardClipboardForPaste,
    resetCardClipboardForTests,
    writeCardClipboard
} from '../src/services/cardClipboardService.js';

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

resetCardClipboardForTests();
assert.equal(writeCardClipboard(sourceCards, { sourceBoardId: 'board-a' }), 3);
const clipboardPayload = readCardClipboardForPaste();
assert.equal(clipboardPayload.sourceBoardId, 'board-a');
assert.equal(clipboardPayload.cards.length, 3);
assert.equal(clipboardPayload.cards[0].data.runtimeBodyState, undefined);

let nextId = 0;
const pastedCards = buildPastedCardBatch({
    clipboardCards: clipboardPayload.cards,
    offset: { x: 100, y: 50 },
    scale: 2,
    viewportWidth: 1400,
    viewportHeight: 900,
    currentPasteSequence: clipboardPayload.pasteSequence,
    createId: () => `pasted-${++nextId}`
});

assert.deepEqual(pastedCards.map((card) => card.id), ['pasted-1', 'pasted-2', 'pasted-3']);
assert.equal(pastedCards[1].x - pastedCards[0].x, 360);
assert.equal(pastedCards[2].y - pastedCards[0].y, 480);
assert.equal(pastedCards[0].data.messages[0].content, '完整正文一');
assert.equal(sourceCards[0].id, 'source-1', '复制源卡片不能被修改');

const secondPaste = readCardClipboardForPaste();
assert.equal(secondPaste.pasteSequence, 1, '重复粘贴应产生可见偏移');

console.log('Cross-board card clipboard tests passed.');
