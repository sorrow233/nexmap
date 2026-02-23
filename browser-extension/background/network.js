import { REQUEST_TIMEOUT_MS, SOURCE, TARGET_API_URL } from './constants.js';

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export const sendToFlow = async ({ text, userId, requestId }) => {
  const normalizedText = (text || '').trim();
  const normalizedUserId = (userId || '').trim();
  const normalizedRequestId = (requestId || '').trim();

  if (!normalizedText) {
    throw new Error('empty_text');
  }
  if (!normalizedUserId) {
    throw new Error('empty_user_id');
  }

  const safeRequestId = normalizedRequestId || crypto.randomUUID();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(TARGET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: normalizedText,
        userId: normalizedUserId,
        source: SOURCE,
        timestamp: Date.now(),
        requestId: safeRequestId,
        idempotencyKey: safeRequestId
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`http_${response.status}`);
    }

    const data = await parseJsonSafe(response);

    return {
      success: true,
      method: 'queue',
      requestId: safeRequestId,
      server: data
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('request_timeout');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};
