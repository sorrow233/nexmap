import { MAX_BACKOFF_MS } from './constants.js';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const toErrorMessage = (error) => {
  if (!error) return 'unknown_error';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return String(error);
};

export const calcBackoffMs = (attempt, baseMs) => {
  const ms = baseMs * 2 ** Math.max(0, attempt);
  return Math.min(ms, MAX_BACKOFF_MS);
};
