import assert from 'node:assert/strict';
import {
    buildBatchDeleteMessageConfirmText,
    getMessageSelectionKey,
    removeMessagesFromCardData
} from '../src/components/chat/messageSelection.js';

const cardData = {
    title: '批量删除测试',
    messages: [
        { id: 'm1', role: 'user', content: '保留消息' },
        { id: 'm2', role: 'assistant', content: '删除消息一' },
        { role: 'user', content: '删除消息二（无 ID）' },
        { id: 'm4', role: 'assistant', content: '最后保留消息' }
    ]
};

const selectedKeys = new Set([
    getMessageSelectionKey(cardData.messages[1], 1),
    getMessageSelectionKey(cardData.messages[2], 2)
]);
const result = removeMessagesFromCardData(cardData, selectedKeys);

assert.notEqual(result, cardData);
assert.deepEqual(result.messages.map((message) => message.content), [
    '保留消息',
    '最后保留消息'
]);
assert.equal(cardData.messages.length, 4, '原消息数组不应被修改');
assert.equal(removeMessagesFromCardData(cardData, new Set()), cardData);
assert.equal(removeMessagesFromCardData(cardData, new Set(['id:not-found'])), cardData);
assert.equal(
    buildBatchDeleteMessageConfirmText(2, '删除 {count} 条？'),
    '删除 2 条？'
);

console.log('Message batch delete tests passed.');
