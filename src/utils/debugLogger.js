/**
 * Centralized Debug Logger for NexMap
 * 
 * Provides distinct, high-fidelity logging for development and beta environments.
 * Completely inert in production MAIN branch to prevent console pollution.
 * 
 * Features:
 * - Namespace coloring
 * - Collapsible groups for complex data
 * - Performance timing
 * - Object table views
 * - Stack tracing for errors
 */

const IS_DEBUG_MODE = import.meta.env.MODE === 'beta' || import.meta.env.MODE === 'development';

// Brand colors for distinct modules
const STYLES = {
    AUTH: 'background: #3b82f6; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    STORAGE: 'background: #10b981; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    SYNC: 'background: #8b5cf6; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    UI: 'background: #f59e0b; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    AI: 'background: #ec4899; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    STORE: 'background: #64748b; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    ROUTING: 'background: #0ea5e9; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    ERROR: 'background: #ef4444; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    WARN: 'background: #f97316; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    DEFAULT: 'background: #71717a; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
};

const getTimestamp = () => new Date().toLocaleTimeString('en-GB', { hour12: false, fractionalSecondDigits: 3 });

class DebugLogger {
    constructor() {
        this.timers = new Map();
    }

    /**
     * Internal logger specifically for formatting
     */
    _log(level, module, message, ...args) {
        if (!IS_DEBUG_MODE) return;

        const style = STYLES[module] || STYLES.DEFAULT;
        const timestamp = getTimestamp();

        // If the first arg is an object/array and we want detailed view, use console.dir or simple log
        // But for general usage:
        console.log(`%c${module}%c ${timestamp} ➤ ${message}`, style, 'color: #9ca3af; font-family: monospace;', ...args);
    }

    /**
     * Start a collapsed group in the console
     */
    group(module, title) {
        if (!IS_DEBUG_MODE) return;
        const style = STYLES[module] || STYLES.DEFAULT;
        console.groupCollapsed(`%c${module}%c ${title}`, style, 'color: inherit');
    }

    /**
     * End the current group
     */
    groupEnd() {
        if (!IS_DEBUG_MODE) return;
        console.groupEnd();
    }

    /**
     * Log tabular data
     */
    table(module, message, data) {
        if (!IS_DEBUG_MODE) return;
        this._log('info', module, message);
        if (data) console.table(data);
    }

    /**
     * Start a timer
     */
    time(label) {
        if (!IS_DEBUG_MODE) return;
        console.time(label);
    }

    /**
     * End a timer
     */
    timeEnd(label) {
        if (!IS_DEBUG_MODE) return;
        console.timeEnd(label);
    }

    /**
     * Standard category loggers
     */
    auth(msg, ...data) { this._log('info', 'AUTH', msg, ...data); }
    storage(msg, ...data) { this._log('info', 'STORAGE', msg, ...data); }
    sync(msg, ...data) { this._log('info', 'SYNC', msg, ...data); }
    ui(msg, ...data) { this._log('info', 'UI', msg, ...data); }
    ai(msg, ...data) { this._log('info', 'AI', msg, ...data); }
    store(msg, ...data) { this._log('info', 'STORE', msg, ...data); }
    routing(msg, ...data) { this._log('info', 'ROUTING', msg, ...data); }

    /**
     * Error logger with stack trace
     */
    error(msg, error = null) {
        if (!IS_DEBUG_MODE) return;
        const style = STYLES.ERROR;
        const timestamp = getTimestamp();
        console.group(`%cERROR%c ${timestamp} ➤ ${msg}`, style, 'color: #ef4444; font-weight: bold;');
        if (error) {
            console.error(error);
            // Optionally log custom data if present on error
            if (error.response) console.log('Response:', error.response);
        }
        console.trace();
        console.groupEnd();
    }

    /**
     * Warning logger
     */
    warn(msg, ...data) {
        if (!IS_DEBUG_MODE) return;
        const style = STYLES.WARN;
        const timestamp = getTimestamp();
        console.warn(`%cWARN%c ${timestamp} ➤ ${msg}`, style, 'color: #f97316;', ...data);
    }
}

export const debugLog = new DebugLogger();
