import assert from 'node:assert/strict';
import {
    keepOnlyCurrentUserMessageImages,
    PRIOR_CONTEXT_IMAGE_PLACEHOLDER
} from '../src/services/ai/chatContextImages.js';

const image = (id) => ({ type: 'image', source: { type: 'idb', id } });

const textOnlyFollowUp = keepOnlyCurrentUserMessageImages([
    { role: 'user', content: [{ type: 'text', text: 'read this' }, image('old')] },
    { role: 'assistant', content: 'done' },
    { role: 'user', content: 'follow up' }
]);

assert.equal(textOnlyFollowUp[0].content.some((part) => part.type === 'image'), false);
assert.equal(textOnlyFollowUp[0].content.at(-1).text, `\n\n${PRIOR_CONTEXT_IMAGE_PLACEHOLDER}`);

const currentImageTurn = keepOnlyCurrentUserMessageImages([
    { role: 'user', content: [{ type: 'text', text: 'old' }, image('old')] },
    { role: 'assistant', content: 'done' },
    { role: 'user', content: [{ type: 'text', text: 'new' }, image('current')] }
]);

assert.equal(currentImageTurn[0].content.some((part) => part.type === 'image'), false);
assert.equal(currentImageTurn[2].content.some((part) => part.source?.id === 'current'), true);

const multipleOldImages = keepOnlyCurrentUserMessageImages([
    { role: 'user', content: [{ type: 'text', text: 'old' }, image('a'), image('b')] },
    { role: 'user', content: 'latest' }
]);

assert.equal(multipleOldImages[0].content.at(-1).text, `\n\n${PRIOR_CONTEXT_IMAGE_PLACEHOLDER} x2`);

console.log('chat context image policy tests passed');
