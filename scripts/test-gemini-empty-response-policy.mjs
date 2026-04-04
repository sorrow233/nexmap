import {
    EMPTY_RESPONSE_CODE,
    createGeminiEmptyResponseError,
    shouldTreatEmptyGeminiSuccessAsRetryable
} from '../src/services/llm/providers/gemini/emptyResponsePolicy.js';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

assert(
    shouldTreatEmptyGeminiSuccessAsRetryable({
        isOfficialGemini31PreviewRequest: true
    }) === true,
    'official gemini 3.1 preview should treat empty success as retryable'
);

assert(
    shouldTreatEmptyGeminiSuccessAsRetryable({
        isOfficialGemini31PreviewRequest: false
    }) === false,
    'official non-3.1-preview models should not use the empty-success retry policy'
);

assert(
    shouldTreatEmptyGeminiSuccessAsRetryable({
        isOfficialGemini31PreviewRequest: false
    }) === false,
    'proxy providers should keep the historical empty-success behavior'
);

const emptyError = createGeminiEmptyResponseError('empty');
assert(emptyError.code === EMPTY_RESPONSE_CODE, 'empty response error should carry EMPTY_RESPONSE code');
assert(emptyError.retryable === true, 'empty response error should be retryable');

console.log('[test-gemini-empty-response-policy] PASS');
