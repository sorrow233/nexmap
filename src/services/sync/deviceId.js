import { uuid } from '../../utils/uuid';

const DEVICE_ID_KEY = 'mixboard_sync_device_id';

export const getSyncDeviceId = () => {
    try {
        const existing = localStorage.getItem(DEVICE_ID_KEY);
        if (existing) return existing;
        const next = uuid();
        localStorage.setItem(DEVICE_ID_KEY, next);
        return next;
    } catch {
        return uuid();
    }
};
