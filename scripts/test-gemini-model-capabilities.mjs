import assert from 'node:assert/strict';
import {
    isGemini3FlashModel,
    isGemini37FlashModel,
    resolveGeminiDefaultMaxOutputTokens,
    shouldDefaultGeminiThinkingHigh
} from '../src/services/llm/providers/gemini/modelCapabilities.js';

assert.equal(isGemini3FlashModel('gemini-3-flash-preview'), true);
assert.equal(isGemini3FlashModel('google/gemini-3.6-flash'), true);
assert.equal(isGemini3FlashModel('gemini-3.7-flash'), true);
assert.equal(isGemini3FlashModel('gemini-2.5-flash'), false);

assert.equal(isGemini37FlashModel('google/gemini-3.7-flash'), true);
assert.equal(isGemini37FlashModel('gemini-3.6-flash'), false);
assert.equal(shouldDefaultGeminiThinkingHigh('gemini-3.7-flash'), true);
assert.equal(shouldDefaultGeminiThinkingHigh('gemini-3.1-pro-preview'), true);
assert.equal(resolveGeminiDefaultMaxOutputTokens('gemini-3.7-flash'), 65536);
assert.equal(resolveGeminiDefaultMaxOutputTokens('gemini-3.1-pro-preview'), 65536);
assert.equal(resolveGeminiDefaultMaxOutputTokens('gemini-3.6-flash'), null);

console.log('Gemini model capability tests passed.');

