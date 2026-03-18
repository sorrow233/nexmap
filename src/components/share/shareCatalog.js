import { THEME_CONFIGS } from './themeConfigs';

export const DEFAULT_SHARE_PRESET = {
    theme: 'modern',
    layout: 'card',
    resolution: 'print',
    showWatermark: true
};

const SIMPLE_THEME_IDS = ['modern', 'editorial', 'zen', 'night'];

export const SHARE_LAYOUTS = [
    { id: 'card', size: 'Auto' },
    { id: 'social', size: '1:1' },
    { id: 'slide', size: '16:9' }
];

export const SHARE_RESOLUTIONS = [
    { id: 'hd', scale: 3, shortLabel: '3x' },
    { id: 'print', scale: 4, shortLabel: '4x' }
];

export const SHARE_DOWNLOAD_FORMAT = {
    id: 'webp',
    mime: 'image/webp',
    ext: 'webp',
    quality: 0.92
};

export const SHARE_WEBP_FORMAT = {
    id: 'webp',
    mime: 'image/webp',
    ext: 'webp',
    quality: 0.92
};

export const SHARE_PNG_FORMAT = {
    id: 'png',
    mime: 'image/png',
    ext: 'png',
    quality: 1
};

export const SHARE_CLIPBOARD_FORMATS = [
    SHARE_WEBP_FORMAT,
    SHARE_PNG_FORMAT
];

function buildThemeMeta(themeId) {
    const theme = THEME_CONFIGS[themeId];
    if (!theme) return null;

    return {
        id: theme.id,
        label: theme.name,
        bg: theme.bg,
        accent: theme.accent,
        text: theme.text
    };
}

export function getShareThemeOptions() {
    return SIMPLE_THEME_IDS
        .map((themeId) => buildThemeMeta(themeId))
        .filter(Boolean);
}

export function getShareThemeMeta(themeId) {
    return buildThemeMeta(themeId);
}

export function getShareLayoutMeta(layoutId) {
    return SHARE_LAYOUTS.find((layout) => layout.id === layoutId) || SHARE_LAYOUTS[0];
}

export function getShareResolutionMeta(resolutionId) {
    return SHARE_RESOLUTIONS.find((resolution) => resolution.id === resolutionId) || SHARE_RESOLUTIONS[0];
}
