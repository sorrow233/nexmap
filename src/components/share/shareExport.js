import html2canvas from 'html2canvas';
import { getThemeBackground } from './themeConfigs';

const EXPORT_RENDER_DELAY_MS = 180;
const MAX_EXPORT_DIMENSION = 8192;
const MAX_EXPORT_PIXELS = 32000000;

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNodeSize(node) {
    const rect = node.getBoundingClientRect();
    return {
        width: Math.max(rect.width, node.scrollWidth || 0, node.offsetWidth || 0, 1),
        height: Math.max(rect.height, node.scrollHeight || 0, node.offsetHeight || 0, 1)
    };
}

function getSafeScale(width, height, requestedScale) {
    const widthLimit = MAX_EXPORT_DIMENSION / width;
    const heightLimit = MAX_EXPORT_DIMENSION / height;
    const pixelLimit = Math.sqrt(MAX_EXPORT_PIXELS / (width * height));
    const safeScale = Math.min(requestedScale, widthLimit, heightLimit, pixelLimit);

    return Number(Math.max(1, safeScale).toFixed(2));
}

export async function generateShareCanvas(node, { themeId, requestedScale }) {
    if (!node) {
        throw new Error('capture-target-missing');
    }

    if (document.fonts?.ready) {
        await document.fonts.ready;
    }

    await wait(EXPORT_RENDER_DELAY_MS);

    const { width, height } = getNodeSize(node);
    const safeScale = getSafeScale(width, height, requestedScale);

    const canvas = await html2canvas(node, {
        scale: safeScale,
        backgroundColor: getThemeBackground(themeId),
        logging: false,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 0
    });

    return {
        canvas,
        safeScale,
        wasScaledDown: safeScale < requestedScale
    };
}

export function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('blob-generation-failed'));
                return;
            }

            if (mimeType === 'image/webp' && blob.type !== mimeType) {
                reject(new Error('unsupported-export-format'));
                return;
            }

            resolve(blob);
        }, mimeType, quality);
    });
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}

export async function copyBlobToClipboard(blob) {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        throw new Error('clipboard-unsupported');
    }

    await navigator.clipboard.write([
        new ClipboardItem({
            [blob.type || 'image/png']: blob
        })
    ]);
}

export function buildShareFilename({ themeId, layoutId, extension }) {
    const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, '').replace(/[:T]/g, '-');
    return `nexmap-${themeId}-${layoutId}-${stamp}.${extension}`;
}
