import assert from 'node:assert/strict';
import {
    getRemoteMetadataRetryDelay,
    isNetworkAvailable,
    REMOTE_METADATA_RETRY_MAX_MS
} from '../src/services/sync/networkRetryPolicy.js';

const centeredRandom = () => 0.5;

assert.equal(getRemoteMetadataRetryDelay(0, { random: centeredRandom }), 10_000);
assert.equal(getRemoteMetadataRetryDelay(1, { random: centeredRandom }), 20_000);
assert.equal(getRemoteMetadataRetryDelay(4, { random: centeredRandom }), 160_000);
assert.equal(
    getRemoteMetadataRetryDelay(99, { random: centeredRandom }),
    REMOTE_METADATA_RETRY_MAX_MS
);
assert.equal(getRemoteMetadataRetryDelay(-4, { random: centeredRandom }), 10_000);
assert.equal(getRemoteMetadataRetryDelay(2, { random: () => 0 }), 32_000);
assert.equal(getRemoteMetadataRetryDelay(2, { random: () => 1 }), 48_000);
assert.equal(isNetworkAvailable(), true);

console.log('Firestore network retry policy tests passed');
