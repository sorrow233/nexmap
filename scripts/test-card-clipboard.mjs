import assert from 'node:assert/strict';
import {
    buildFullCardClipboardText,
    getCardMessageClipboardText,
    resolveFullCardForClipboard
} from '../src/utils/cardClipboard.js';

const fullCard = {
    id: 'copy-card',
    data: {
        title: '**完整对话**',
        messages: [
            { id: 'm1', role: 'user', content: '第一条完整提问' },
            {
                id: 'm2',
                role: 'assistant',
                content: [
                    { type: 'text', text: '第一段回答' },
                    { type: 'image', source: { url: 'https://example.com/result.png' } },
                    { type: 'text', text: '第二段回答' }
                ]
            },
            { id: 'm3', role: 'user', content: '最后一条提问' }
        ]
    }
};

const dehydratedCard = {
    ...fullCard,
    data: {
        ...fullCard.data,
        runtimeBodyState: { hydrated: false, messageCount: 3 },
        messages: fullCard.data.messages.map((message, index) => ({
            ...message,
            content: index === fullCard.data.messages.length - 1 ? '最后一条提问' : ''
        }))
    }
};
let requestedCardId = '';
const hydratedCard = resolveFullCardForClipboard(dehydratedCard, (cardId) => {
    requestedCardId = cardId;
    return fullCard;
});
assert.equal(requestedCardId, 'copy-card');
const clipboardText = buildFullCardClipboardText(hydratedCard);
assert.match(clipboardText, /^完整对话/);
assert.match(clipboardText, /第一条完整提问/);
assert.match(clipboardText, /第一段回答\n\[Image\] https:\/\/example\.com\/result\.png\n第二段回答/);
assert.match(clipboardText, /最后一条提问/);
assert.equal(getCardMessageClipboardText('<thinking>隐藏推理</thinking>最终回答'), '最终回答');
assert.throws(
    () => resolveFullCardForClipboard(dehydratedCard, () => dehydratedCard),
    /Full card body is unavailable/
);

console.log('Card clipboard tests passed.');
