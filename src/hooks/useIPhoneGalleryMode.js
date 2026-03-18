import { shouldUseIPhoneSafariCompactLayout } from '../utils/browser';

export function useIPhoneGalleryMode() {
    return shouldUseIPhoneSafariCompactLayout();
}
