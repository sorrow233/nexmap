import assert from 'node:assert/strict';
import {
    DEFAULT_CLAUDE_MAX_OUTPUT_TOKENS,
    resolveModelMaxOutputTokens
} from '../src/services/llm/outputTokenLimit.js';

assert.equal(resolveModelMaxOutputTokens('claude-sonnet-4-5', {}), DEFAULT_CLAUDE_MAX_OUTPUT_TOKENS);
assert.equal(resolveModelMaxOutputTokens('anthropic/claude-opus-4-6', {}), DEFAULT_CLAUDE_MAX_OUTPUT_TOKENS);
assert.equal(resolveModelMaxOutputTokens('claude-sonnet-4-5', { max_tokens: 12000 }), 12000);
assert.equal(resolveModelMaxOutputTokens('gpt-5', {}), null);

console.log('[test-output-token-limit] PASS');
