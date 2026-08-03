(function installStartupModuleRecovery() {
    'use strict';

    var STORAGE_KEY = 'nexmap_startup_module_recovery';
    var RETRY_WINDOW_MS = 30000;
    var MAX_RETRIES = 2;
    var MODULE_ERROR_PATTERNS = [
        'failed to fetch dynamically imported module',
        'error loading dynamically imported module',
        'importing a module script failed',
        'expected a javascript-or-wasm module script',
        'failed to load module script'
    ];

    function getMessage(value) {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (typeof value.message === 'string') return value.message;
        return String(value);
    }

    function isModuleFailure(event) {
        var target = event && event.target;
        var resourceUrl = target && (target.src || target.href) || '';
        var message = getMessage(event && (event.reason || event.error || event.message)).toLowerCase();
        var isScriptAsset = /\/assets\/.*\.(?:js|mjs)(?:\?|$)/i.test(resourceUrl);

        return isScriptAsset || MODULE_ERROR_PATTERNS.some(function matches(pattern) {
            return message.indexOf(pattern) !== -1;
        });
    }

    function readRetryState() {
        try {
            return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
        } catch {
            return null;
        }
    }

    function writeRetryState(state) {
        try {
            window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
            // Safari private storage can reject writes; the reload can still proceed.
        }
    }

    function recover() {
        var now = Date.now();
        var previous = readRetryState();
        var attempts = previous && now - Number(previous.startedAt || 0) < RETRY_WINDOW_MS
            ? Number(previous.attempts || 0)
            : 0;

        if (attempts >= MAX_RETRIES) return false;

        writeRetryState({ attempts: attempts + 1, startedAt: previous && previous.startedAt || now });

        var url = new URL(window.location.href);
        url.searchParams.set('__nexmap_reload__', String(now));
        url.searchParams.set('__nexmap_reason__', 'startup-module-failure');
        window.location.replace(url.toString());
        return true;
    }

    window.addEventListener('error', function handleStartupError(event) {
        if (isModuleFailure(event)) recover();
    }, true);

    window.addEventListener('unhandledrejection', function handleStartupRejection(event) {
        if (isModuleFailure(event)) recover();
    });
})();
