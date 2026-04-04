export const EMPTY_RESPONSE_CODE = 'EMPTY_RESPONSE';

export const createGeminiEmptyResponseError = (message = 'Gemini returned an empty response') => {
    const error = new Error(message);
    error.code = EMPTY_RESPONSE_CODE;
    error.retryable = true;
    return error;
};

export const shouldTreatEmptyGeminiSuccessAsRetryable = ({ isOfficialGemini31PreviewRequest = false } = {}) => (
    isOfficialGemini31PreviewRequest === true
);
