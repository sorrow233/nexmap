import { useEffect, useState } from 'react';
import { shouldUseIOSCompactBoard } from '../utils/browser';

export function useIPhoneBoardMode() {
    const [enabled, setEnabled] = useState(() => shouldUseIOSCompactBoard());

    useEffect(() => {
        const update = () => {
            setEnabled(shouldUseIOSCompactBoard());
        };

        update();

        window.addEventListener('resize', update);
        window.addEventListener('orientationchange', update);
        window.visualViewport?.addEventListener('resize', update);

        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('orientationchange', update);
            window.visualViewport?.removeEventListener('resize', update);
        };
    }, []);

    return enabled;
}
