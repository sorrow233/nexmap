// Browser detection utilities
const userAgent = navigator.userAgent || '';
const platform = navigator.platform || '';
const maxTouchPoints = navigator.maxTouchPoints || 0;
const isIPadDesktopMode = platform === 'MacIntel' && maxTouchPoints > 1;
const matchesIOSUserAgent = /iPad|iPhone|iPod/.test(userAgent);

export const isSafari = /Safari/i.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS|Android/i.test(userAgent);
export const isIOS = (matchesIOSUserAgent || isIPadDesktopMode) && !window.MSStream;
export const isIPhone = /iPhone|iPod/.test(userAgent);
export const isIPad = /iPad/.test(userAgent) || isIPadDesktopMode;
export const isMobile = isIOS || /Android/i.test(userAgent);
export const isTouch = 'ontouchstart' in window || maxTouchPoints > 0;
export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function isCompactViewport(width = window.innerWidth) {
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
    const isStandaloneMedia = typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)').matches
        : false;

    return isStandaloneMedia || window.navigator?.standalone === true;
}

export function shouldShowIPadInstallPrompt() {
    return isIPad && isSafari && !isStandaloneDisplayMode();
}

// iOS Safari 100vh fix - sets CSS custom property for true viewport height
export function setupMobileViewportFix() {
    const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', () => {
        setTimeout(setVH, 100); // Delay for orientation animation
    });

    return () => {
        window.removeEventListener('resize', setVH);
        window.removeEventListener('orientationchange', setVH);
    };
}

// Check if user prefers reduced motion
export function getReducedMotionQuery() {
    return window.matchMedia('(prefers-reduced-motion: reduce)');
}
