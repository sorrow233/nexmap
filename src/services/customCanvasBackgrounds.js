import { idbDel, idbGet, idbSet } from './db/indexedDB';
import {
    isSupportedImageUploadFile,
    normalizeImageUploadFile
} from './image/uploadImageNormalizer';

export const CUSTOM_CANVAS_BACKGROUNDS_KEY = 'mixboard_custom_canvas_backgrounds_v1';
export const CUSTOM_CANVAS_BACKGROUNDS_EVENT = 'mixboard:custom-canvas-backgrounds-changed';
export const MAX_CUSTOM_CANVAS_BACKGROUNDS = 12;
export const MAX_CANVAS_BACKGROUND_SOURCE_BYTES = 25 * 1024 * 1024;

const BLOB_KEY_PREFIX = 'custom_canvas_background_';
const DEFAULT_OPACITY = 0.34;
const MAX_OUTPUT_EDGE = 2560;
const OUTPUT_QUALITY = 0.84;

const clampOpacity = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_OPACITY;
    return Math.min(0.6, Math.max(0.12, parsed));
};

const normalizeItem = (item) => {
    if (!item || typeof item !== 'object') return null;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    if (!id) return null;

    return {
        id,
        name: String(item.name || '画布背景').slice(0, 160),
        type: String(item.type || 'image/webp'),
        size: Math.max(0, Number(item.size) || 0),
        width: Math.max(0, Number(item.width) || 0),
        height: Math.max(0, Number(item.height) || 0),
        createdAt: Math.max(0, Number(item.createdAt) || Date.now())
    };
};

export const normalizeCustomCanvasBackgroundSettings = (value) => {
    const items = Array.isArray(value?.items)
        ? value.items.map(normalizeItem).filter(Boolean).slice(0, MAX_CUSTOM_CANVAS_BACKGROUNDS)
        : [];

    return {
        enabled: value?.enabled !== false && items.length > 0,
        opacity: clampOpacity(value?.opacity),
        items
    };
};

export const loadCustomCanvasBackgroundSettings = () => {
    try {
        const raw = localStorage.getItem(CUSTOM_CANVAS_BACKGROUNDS_KEY);
        return normalizeCustomCanvasBackgroundSettings(raw ? JSON.parse(raw) : null);
    } catch (error) {
        console.warn('[CanvasBackgrounds] Failed to load settings:', error);
        return normalizeCustomCanvasBackgroundSettings(null);
    }
};

const buildBlobKey = (id) => `${BLOB_KEY_PREFIX}${id}`;

export const getCustomCanvasBackgroundBlob = async (id) => {
    if (!id) return null;
    const stored = await idbGet(buildBlobKey(id));
    if (stored instanceof Blob) return stored;
    if (stored?.blob instanceof Blob) return stored.blob;
    return null;
};

const canvasToBlob = (canvas) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
        if (blob instanceof Blob) {
            resolve(blob);
            return;
        }
        reject(new Error('无法压缩这张图片。'));
    }, 'image/webp', OUTPUT_QUALITY);
});

const decodeBackgroundImage = async (sourceFile) => {
    if (typeof createImageBitmap === 'function') {
        return createImageBitmap(sourceFile);
    }

    const objectUrl = URL.createObjectURL(sourceFile);
    try {
        const image = new Image();
        image.decoding = 'async';
        image.src = objectUrl;
        await image.decode();
        return image;
    } catch (error) {
        URL.revokeObjectURL(objectUrl);
        throw error;
    }
};

const createOptimizedBackgroundBlob = async (sourceFile) => {
    const bitmap = await decodeBackgroundImage(sourceFile);
    try {
        const sourceWidth = bitmap.width || bitmap.naturalWidth;
        const sourceHeight = bitmap.height || bitmap.naturalHeight;
        const longestEdge = Math.max(sourceWidth, sourceHeight);
        const scale = longestEdge > MAX_OUTPUT_EDGE ? MAX_OUTPUT_EDGE / longestEdge : 1;
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) {
            throw new Error('当前设备无法处理图片。');
        }

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(bitmap, 0, 0, width, height);

        return {
            blob: await canvasToBlob(canvas),
            width,
            height
        };
    } finally {
        bitmap.close?.();
        if (bitmap instanceof HTMLImageElement && bitmap.src.startsWith('blob:')) {
            URL.revokeObjectURL(bitmap.src);
        }
    }
};

const createBackgroundId = () => {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }
    return `bg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const prepareCustomCanvasBackground = async (file) => {
    if (!isSupportedImageUploadFile(file)) {
        throw new Error(`“${file?.name || '所选文件'}”不是支持的图片格式。`);
    }
    if ((Number(file.size) || 0) > MAX_CANVAS_BACKGROUND_SOURCE_BYTES) {
        throw new Error(`“${file.name}”超过 25 MB，请先压缩后再上传。`);
    }

    const normalizedFile = await normalizeImageUploadFile(file);
    const optimized = await createOptimizedBackgroundBlob(normalizedFile);
    const id = createBackgroundId();

    return {
        id,
        name: String(file.name || '画布背景').slice(0, 160),
        type: optimized.blob.type || 'image/webp',
        size: optimized.blob.size,
        width: optimized.width,
        height: optimized.height,
        createdAt: Date.now(),
        blob: optimized.blob,
        persisted: false
    };
};

export const loadCustomCanvasBackgroundLibrary = async () => {
    const settings = loadCustomCanvasBackgroundSettings();
    const loadedItems = await Promise.all(settings.items.map(async (item) => {
        const blob = await getCustomCanvasBackgroundBlob(item.id);
        return blob ? { ...item, blob, persisted: true } : null;
    }));
    const items = loadedItems.filter(Boolean);

    return {
        ...settings,
        enabled: settings.enabled && items.length > 0,
        items
    };
};

export const saveCustomCanvasBackgroundLibrary = async (draft) => {
    const current = loadCustomCanvasBackgroundSettings();
    const items = Array.isArray(draft?.items)
        ? draft.items.slice(0, MAX_CUSTOM_CANVAS_BACKGROUNDS)
        : [];
    const normalized = normalizeCustomCanvasBackgroundSettings({
        enabled: draft?.enabled,
        opacity: draft?.opacity,
        items
    });
    const nextIds = new Set(normalized.items.map(item => item.id));

    for (const item of items) {
        if (!item?.id || !(item.blob instanceof Blob) || item.persisted === true) continue;
        await idbSet(buildBlobKey(item.id), {
            blob: item.blob,
            updatedAt: Date.now()
        });
    }

    localStorage.setItem(CUSTOM_CANVAS_BACKGROUNDS_KEY, JSON.stringify(normalized));

    for (const oldItem of current.items) {
        if (!nextIds.has(oldItem.id)) {
            try {
                await idbDel(buildBlobKey(oldItem.id));
            } catch (error) {
                console.warn('[CanvasBackgrounds] Failed to remove an unused background blob:', error);
            }
        }
    }

    window.dispatchEvent(new CustomEvent(CUSTOM_CANVAS_BACKGROUNDS_EVENT));
    return normalized;
};

export const selectCustomCanvasBackground = (items, boardId) => {
    if (!Array.isArray(items) || items.length === 0) return null;
    const seed = String(boardId || 'default-canvas');
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return items[(hash >>> 0) % items.length] || items[0];
};
