import React from 'react';

/**
 * Physics-based "Fluid Typewriter" hook.
 * Instead of linear increments, this uses a spring-like ease-out function:
 * Speed is proportional to the distance left.
 * This creates a "pushing" effect where large chunks accelerate the text,
 * then it naturally slows down as it settles, feeling like water flowing.
 */
export const useFluidTypewriter = (targetContent, isStreaming) => {
    const [displayedContent, setDisplayedContent] = React.useState(() => {
        return isStreaming ? '' : targetContent;
    });

    // Use a ref to track the float value of length for smoother math
    // (We only render integer substrings, but math needs floats)
    const currentLength = React.useRef(isStreaming ? 0 : targetContent.length);
    const frameRef = React.useRef();

    React.useEffect(() => {
        if (!isStreaming) {
            setDisplayedContent(targetContent);
            currentLength.current = targetContent.length;
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            return;
        }

        const animate = () => {
            const targetLen = targetContent.length;
            const currentLen = currentLength.current;
            const diff = targetLen - currentLen;

            // Updated physics for "Flash" speed and liquid feel
            if (diff <= 0.5) {
                if (currentLen !== targetLen) {
                    currentLength.current = targetLen;
                    setDisplayedContent(targetContent);
                }
                frameRef.current = requestAnimationFrame(animate);
                return;
            }

            // High tension (0.8) for fast response, higher base (1.5) for constant flow
            const velocity = (diff * 0.8) + 1.5;

            currentLength.current += velocity;

            if (currentLength.current > targetLen) currentLength.current = targetLen;

            setDisplayedContent(targetContent.substring(0, Math.floor(currentLength.current)));
            frameRef.current = requestAnimationFrame(animate);
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [targetContent, isStreaming]);

    return displayedContent;
};

export default useFluidTypewriter;
