/**
 * Centralized Debug Logger for NexMap
 * 
 * Only executes when import.meta.env.MODE is 'beta' or 'development'.
 * Use this for high-fidelity logs of critical logic paths.
 */

const IS_BETA = import.meta.env.MODE === 'beta' || import.meta.env.MODE === 'development';

const COLORS = {
    AUTH: '#3b82f6',     // Blue
    STORAGE: '#10b981',  // Emerald
    SYNC: '#8b5cf6',     // Violet
    UI: '#f59e0b',       // Amber
    AI: '#ec4899',       // Pink
    STORE: '#64748b',    // Slate
    ERROR: '#ef4444',    // Red
};

const formatModule = (module) => `[${module.toUpperCase()}]`;

const logger = (module, message, data = null) => {
    if (!IS_BETA) return;

    const color = COLORS[module.toUpperCase()] || COLORS.STORE;
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false, fractionalSecondDigits: 3 });

    const prefix = `%c${timestamp} ${formatModule(module)}`;
    const style = `color: ${color}; font-weight: bold;`;

    if (data !== null) {
        console.log(prefix, style, message, data);
    } else {
        console.log(prefix, style, message);
    }
};

export const debugLog = {
    auth: (msg, data) => logger('AUTH', msg, data),
    storage: (msg, data) => logger('STORAGE', msg, data),
    sync: (msg, data) => logger('SYNC', msg, data),
    ui: (msg, data) => logger('UI', msg, data),
    ai: (msg, data) => logger('AI', msg, data),
    store: (msg, data) => logger('STORE', msg, data),
    error: (msg, data) => logger('ERROR', msg, data),
};
