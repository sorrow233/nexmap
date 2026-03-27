import { useEffect } from 'react';
import { ensureLatestBuildOrRefresh } from '../utils/buildVersion';

export function useBuildVersionRefresh() {
    useEffect(() => {
        let disposed = false;

        const checkForNewBuild = async (force = false) => {
            if (disposed || typeof document === 'undefined') return;
            if (!force && document.visibilityState === 'hidden') return;

            await ensureLatestBuildOrRefresh({ force, reload: false });
        };

        void checkForNewBuild(true);

        const handleFocus = () => {
            void checkForNewBuild(false);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void checkForNewBuild(false);
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            disposed = true;
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);
}
