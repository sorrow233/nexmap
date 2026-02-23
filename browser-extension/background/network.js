import { REQUEST_TIMEOUT_MS, SOURCE, TARGET_API_URL } from './constants.js';

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export const sendToFlow = async ({ text, userId }) => {
  const normalizedText = (text || '').trim();
  if (!normalizedText) {
    throw new Error('empty_text');
  }

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
        userId: userId || undefined,
        source: SOURCE,
        timestamp: Date.now()
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`http_${response.status}`);
    }

    const data = await parseJsonSafe(response);

    if (!userId && data.redirectUrl) {
      await chrome.tabs.create({ url: data.redirectUrl });
      return { success: true, method: 'redirect' };
    }

    return { success: true, method: userId ? 'queue' : 'unknown' };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('request_timeout');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};
