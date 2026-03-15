import { shouldUseIOSCompactBoard } from '../utils/browser';

export function useIPhoneBoardMode() {
    return shouldUseIOSCompactBoard();
}
