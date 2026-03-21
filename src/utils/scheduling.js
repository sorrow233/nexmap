export const yieldToMainThread = () => new Promise((resolve) => {
    if (typeof window === 'undefined') {
        setTimeout(resolve, 0);
        return;
    }

    if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
            window.setTimeout(resolve, 0);
        });
        return;
    }

    window.setTimeout(resolve, 0);
});
