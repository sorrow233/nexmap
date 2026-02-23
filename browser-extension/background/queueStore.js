import { STORAGE_DEAD_LETTER_KEY, STORAGE_QUEUE_KEY } from './constants.js';

export const loadQueue = async () => {
  const data = await chrome.storage.local.get(STORAGE_QUEUE_KEY);
  const queue = data[STORAGE_QUEUE_KEY];
  return Array.isArray(queue) ? queue : [];
};

export const saveQueue = async (queue) => {
  await chrome.storage.local.set({ [STORAGE_QUEUE_KEY]: queue });
};

export const loadDeadLetters = async () => {
  const data = await chrome.storage.local.get(STORAGE_DEAD_LETTER_KEY);
  const letters = data[STORAGE_DEAD_LETTER_KEY];
  return Array.isArray(letters) ? letters : [];
};

export const saveDeadLetters = async (letters) => {
  await chrome.storage.local.set({ [STORAGE_DEAD_LETTER_KEY]: letters });
};
