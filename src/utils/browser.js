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
export const isIPad = /iPad/.test(userAgent) || isIPadDesktopMode;
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
    // iPhone Safari should keep the dedicated mobile shell even after rotation.
    return isIPhone && isSafari;
}

export function shouldUseIOSCompactBoard() {
    return shouldUseIPhoneSafariCompactLayout();
}

export function isStandaloneDisplayMode() {
    const isStandaloneMedia = browserWindow && typeof browserWindow.matchMedia === 'function'
        ? browserWindow.matchMedia('(display-mode: standalone)').matches
        : false;

    return isStandaloneMedia || browserWindow?.navigator?.standalone === true;
}

export function shouldShowIPadInstallPrompt() {
    return isIPad && isSafari && !isStandaloneDisplayMode();
}

// iOS Safari 100vh fix - sets CSS custom property for true viewport height
export function setupMobileViewportFix() {
    if (!browserWindow) return () => {};

    const setVH = () => {
        const vh = browserWindow.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    const handleOrientationChange = () => {
        browserWindow.setTimeout(setVH, 100);
    };

    setVH();
    browserWindow.addEventListener('resize', setVH);
    browserWindow.addEventListener('orientationchange', handleOrientationChange);

    return () => {
        browserWindow.removeEventListener('resize', setVH);
        browserWindow.removeEventListener('orientationchange', handleOrientationChange);
    };
}

// Check if user prefers reduced motion
export function getReducedMotionQuery() {
    if (browserWindow && typeof browserWindow.matchMedia === 'function') {
        return browserWindow.matchMedia('(prefers-reduced-motion: reduce)');
    }

    return null;
}
