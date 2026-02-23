export const TARGET_API_URL = 'https://flowstudio.catzz.work/api/import';

export const ALARM_NAME = 'aimainmap-flow-retry';
export const STORAGE_QUEUE_KEY = 'aimainmap_extension_retry_queue';

export const SOURCE = 'aimainmap-browser-extension';
export const MAX_DIRECT_RETRIES = 3;
export const MAX_QUEUE_ATTEMPTS = 8;
export const MAX_CONCURRENCY = 2;

export const REQUEST_TIMEOUT_MS = 15000;
export const DIRECT_BACKOFF_BASE_MS = 1200;
export const QUEUE_BACKOFF_BASE_MS = 30000;
export const MAX_BACKOFF_MS = 5 * 60 * 1000;
export const MAX_QUEUE_SIZE = 200;
