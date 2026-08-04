// Browser detection utilities
const browserWindow = typeof window !== 'undefined' ? window : null;
const browserNavigator = typeof navigator !== 'undefined'
    ? navigator
    : { userAgent: '', platform: '', maxTouchPoints: 0 };

const userAgent = browserNavigator.userAgent || '';
const platform = browserNavigator.platform || '';
const maxTouchPoints = browserNavigator.maxTouchPoints || 0;
const isIPadDesktopMode = platform === 'MacIntel' && maxTouchPoints > 1;
const matchesIOSUserAgent = /iPad|iPhone|iPod/.test(userAgent);

export const isSafari = /Safari/i.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS|Android/i.test(userAgent);
export const isIOS = (matchesIOSUserAgent || isIPadDesktopMode) && !(browserWindow && browserWindow.MSStream);
export const isIPhone = /iPhone|iPod/.test(userAgent);
export const isMobile = isIOS || /Android/i.test(userAgent);
export const isTouch = Boolean(browserWindow && 'ontouchstart' in browserWindow) || maxTouchPoints > 0;
export const prefersReducedMotion = Boolean(
    browserWindow
    && typeof browserWindow.matchMedia === 'function'
    && browserWindow.matchMedia('(prefers-reduced-motion: reduce)').matches
);

export function isCompactViewport(width = browserWindow?.innerWidth || 0) {
    return width <= 640;
}

export function shouldUseIPhoneSafariCompactLayout() {
    // Every browser on iPhone uses the iOS web runtime and needs the same compact shell.
    // Keeping this tied to Safari caused Chrome/Edge/Firefox on iOS to render the desktop canvas.
    return isIPhone;
}

export function shouldUseIOSCompactBoard() {
    return shouldUseIPhoneSafariCompactLayout();
}

// iOS Safari 100vh fix - sets CSS custom property for true viewport height
export function setupMobileViewportFix() {
    if (!browserWindow) return () => {};

    const viewport = browserWindow.visualViewport;
    let updateFrame = null;
    let lastMetrics = '';
    const setViewportMetrics = () => {
        updateFrame = null;
        const viewportHeight = Math.round((viewport?.height || browserWindow.innerHeight) * 2) / 2;
        const viewportOffsetTop = Math.round((viewport?.offsetTop || 0) * 2) / 2;
        const nextMetrics = `${viewportHeight}:${viewportOffsetTop}`;
        if (nextMetrics === lastMetrics) return;

        lastMetrics = nextMetrics;
        const vh = viewportHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        document.documentElement.style.setProperty('--mobile-viewport-height', `${viewportHeight}px`);
        document.documentElement.style.setProperty('--mobile-viewport-offset-top', `${viewportOffsetTop}px`);
    };
    const scheduleViewportMetrics = () => {
        if (updateFrame !== null) return;
        updateFrame = browserWindow.requestAnimationFrame(setViewportMetrics);
    };
    const handleOrientationChange = () => {
        browserWindow.setTimeout(scheduleViewportMetrics, 100);
    };

    setViewportMetrics();
    browserWindow.addEventListener('resize', scheduleViewportMetrics);
    browserWindow.addEventListener('orientationchange', handleOrientationChange);
    viewport?.addEventListener('resize', scheduleViewportMetrics);

    return () => {
        if (updateFrame !== null) {
            browserWindow.cancelAnimationFrame(updateFrame);
        }
        browserWindow.removeEventListener('resize', scheduleViewportMetrics);
        browserWindow.removeEventListener('orientationchange', handleOrientationChange);
        viewport?.removeEventListener('resize', scheduleViewportMetrics);
    };
}

// Check if user prefers reduced motion
export function getReducedMotionQuery() {
    if (browserWindow && typeof browserWindow.matchMedia === 'function') {
        return browserWindow.matchMedia('(prefers-reduced-motion: reduce)');
    }

    return null;
}
