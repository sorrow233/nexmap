// Browser detection utilities
export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
export const isMobile = isIOS || /Android/i.test(navigator.userAgent);
export const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
