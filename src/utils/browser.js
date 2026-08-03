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
    const setViewportMetrics = () => {
        const viewportHeight = viewport?.height || browserWindow.innerHeight;
        const viewportOffsetTop = viewport?.offsetTop || 0;
        const vh = viewportHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        document.documentElement.style.setProperty('--mobile-viewport-height', `${viewportHeight}px`);
        document.documentElement.style.setProperty('--mobile-viewport-offset-top', `${viewportOffsetTop}px`);
    };
    const handleOrientationChange = () => {
        browserWindow.setTimeout(setViewportMetrics, 100);
    };

    setViewportMetrics();
    browserWindow.addEventListener('resize', setViewportMetrics);
    browserWindow.addEventListener('orientationchange', handleOrientationChange);
    viewport?.addEventListener('resize', setViewportMetrics);
    viewport?.addEventListener('scroll', setViewportMetrics);

    return () => {
        browserWindow.removeEventListener('resize', setViewportMetrics);
        browserWindow.removeEventListener('orientationchange', handleOrientationChange);
        viewport?.removeEventListener('resize', setViewportMetrics);
        viewport?.removeEventListener('scroll', setViewportMetrics);
    };
}

// Check if user prefers reduced motion
export function getReducedMotionQuery() {
    if (browserWindow && typeof browserWindow.matchMedia === 'function') {
        return browserWindow.matchMedia('(prefers-reduced-motion: reduce)');
    }

    return null;
}
