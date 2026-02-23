export const TARGET_API_URL = 'https://flowstudio.catzz.work/api/import';

export const MESSAGE_TYPES = Object.freeze({
  SEND: 'AIM_FLOW_SEND',
  QUEUE_STATS: 'AIM_FLOW_QUEUE_STATS',
  QUEUE_FLUSH: 'AIM_FLOW_QUEUE_FLUSH'
});

export const CONTEXT_MENU_ID = 'aim-flow-send-selection';
export const STORAGE_FLOW_UID_KEY = 'flowstudio_user_id';
export const STORAGE_LAST_EVENT_KEY = 'aimainmap_extension_last_event';

export const ALARM_NAME = 'aimainmap-flow-retry';
export const STORAGE_QUEUE_KEY = 'aimainmap_extension_retry_queue';
export const STORAGE_DEAD_LETTER_KEY = 'aimainmap_extension_dead_letters';

export const SOURCE = 'aimainmap-browser-extension';
export const MAX_DIRECT_RETRIES = 3;
export const MAX_QUEUE_ATTEMPTS = 8;
export const MAX_CONCURRENCY = 2;
export const MAX_DRAIN_BATCHES = 24;

export const MAX_SELECTION_CHARS = 12000;
export const FLOW_UID_MIN_LENGTH = 16;

export const REQUEST_TIMEOUT_MS = 15000;
export const DIRECT_BACKOFF_BASE_MS = 1200;
export const QUEUE_BACKOFF_BASE_MS = 30000;
export const MAX_BACKOFF_MS = 5 * 60 * 1000;
export const MAX_QUEUE_SIZE = 200;
export const MAX_DEAD_LETTERS = 100;
