import { isRetryableError } from './errorUtils';

/**
 * Detect whether a Gemini candidate includes grounding/search metadata.
 * This indicates that web search grounding was actually invoked.
 */
export function didCandidateUseSearch(candidate) {
    const grounding = candidate?.groundingMetadata;
    if (!grounding) return false;

    return Boolean(
        (Array.isArray(grounding.webSearchQueries) && grounding.webSearchQueries.length > 0) ||
        (Array.isArray(grounding.groundingChunks) && grounding.groundingChunks.length > 0) ||
        (Array.isArray(grounding.groundingSupports) && grounding.groundingSupports.length > 0) ||
        (Array.isArray(grounding.retrievalQueries) && grounding.retrievalQueries.length > 0) ||
        grounding.searchEntryPoint
    );
}

/**
 * Parses a stream response from Gemini API (via query proxy)
 * @param {ReadableStreamDefaultReader} reader 
 * @param {Function} onToken - Callback for new text chunks
 * @param {Function} onLog - Callback for logging (optional)
 * @returns {Promise<{ usedSearch: boolean }>}
 */
export async function parseGeminiStream(reader, onToken, onLog = console.log) {
    const decoder = new TextDecoder();
    let lastFullText = ''; // Track cumulative text
    let buffer = '';
    let usedSearch = false;

    try {
        onLog('[Gemini] Stream response OK, processing chunks...');
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunkText = decoder.decode(value, { stream: true });
            buffer += chunkText;

            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                let cleanLine = line.trim();
                if (!cleanLine) continue;

                // Handle SSE prefix
                if (cleanLine.startsWith('data: ')) {
                    cleanLine = cleanLine.substring(6).trim();
                }

                // Clean up Python byte string artifacts (common in some proxy responses)
                if (cleanLine.startsWith("b'") || cleanLine.startsWith('b"')) {
                    cleanLine = cleanLine.replace(/^b['"]|['"]$/g, '');
                    // onLog('[Gemini] Detected Python byte string, auto-cleaning:', cleanLine);
                }

                if (!cleanLine || cleanLine === '[DONE]') continue;

                try {
                    const data = JSON.parse(cleanLine);

                    // CRITICAL: Check for API errors that might be returned as JSON (even with 200 OK)
                    if (data.error) {
                        const errMsg = data.error.message || JSON.stringify(data.error);

                        // Check if this is a retryable error
                        if (isRetryableError(errMsg)) {
                            throw { retryable: true, message: errMsg };
                        }

                        throw new Error(errMsg);
                    }

                    const candidate = data.candidates?.[0];
                    if (didCandidateUseSearch(candidate)) {
                        usedSearch = true;
                    }

                    // Gemini stream format: candidate content parts
                    const currentText = candidate?.content?.parts?.[0]?.text;

                    if (currentText) {
                        // Robust Delta Calculation
                        let delta = '';
                        if (currentText.startsWith(lastFullText)) {
                            delta = currentText.substring(lastFullText.length);
                            lastFullText = currentText;
                        } else {
                            delta = currentText;
                            lastFullText += currentText;
                        }

                        if (delta) {
                            onToken(delta);
                        }
                    }
                } catch (jsonErr) {
                    // Handle retryable errors thrown above
                    if (jsonErr.retryable) {
                        throw jsonErr;
                    }

                    // If parsing fails or we threw an error above, re-throw if it's our error
                    if (jsonErr.message && !jsonErr.message.includes('JSON')) {
                        throw jsonErr;
                    }
                    // Try to handle partial JSON or weird provider formats
                    // onLog('[Gemini] Line parse error:', cleanLine.substring(0, 50), jsonErr.message);
                }
            }
        }

        // Process remaining buffer
        if (buffer.trim()) {
            try {
                let cleanLine = buffer.trim().startsWith('data: ') ? buffer.trim().substring(6) : buffer.trim();
                if (cleanLine.startsWith("b'") || cleanLine.startsWith('b"')) {
                    cleanLine = cleanLine.replace(/^b['"]|['"]$/g, '');
                }
                const data = JSON.parse(cleanLine);
                if (data.error) {
                    const errMsg = data.error.message || JSON.stringify(data.error);
                    if (isRetryableError(errMsg)) {
                        throw { retryable: true, message: errMsg };
                    }
                    throw new Error(errMsg);
                }

                const candidate = data.candidates?.[0];
                if (didCandidateUseSearch(candidate)) {
                    usedSearch = true;
                }

                const text = candidate?.content?.parts?.[0]?.text;
                if (text) {
                    const delta = text.startsWith(lastFullText) ? text.substring(lastFullText.length) : text;
                    if (delta) {
                        onToken(delta);
                    }
                }
            } catch (e) {
                if (e.retryable) throw e;
                if (e.message && !e.message.includes('JSON')) throw e;
            }
        }
        return { usedSearch };
    } finally {
        // Reader release is handled by caller or automatic cleanup if properly structured, 
        // but here we just process. The caller should manage the reader lifecycle or we do it here?
        // In the original code, reader.releaseLock() is in a finally block outside the loop.
        // We will leave the release logic to the caller or assume reader is consumed.
    }
}
