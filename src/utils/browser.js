// Browser detection utilities
export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
export const isMobile = isIOS || /Android/i.test(navigator.userAgent);
export const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
