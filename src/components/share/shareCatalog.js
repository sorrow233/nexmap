import { THEME_CONFIGS } from './themeConfigs';

export const DEFAULT_SHARE_PRESET = {
    theme: 'editorial',
    layout: 'card',
    resolution: 'hd',
    format: 'png',
    showWatermark: true
};

export const SHARE_THEME_SECTIONS = [
    {
        id: 'featured',
        themeIds: ['editorial', 'modern', 'swiss', 'zen', 'ghibli', 'night']
    },
    {
        id: 'reading',
        themeIds: ['academia', 'library', 'parchment', 'coffee', 'poetry', 'classic']
    },
    {
        id: 'atmosphere',
        themeIds: ['rainy', 'midnight', 'sakura', 'matcha', 'sky', 'sunset']
    },
    {
        id: 'expressive',
        themeIds: ['terminal', 'citypop', 'manga', 'ocean', 'peach', 'lavender']
    }
];

export const SHARE_LAYOUTS = [
    { id: 'card', size: '1179 x auto' },
    { id: 'full', size: '1179 x auto' },
    { id: 'social', size: '1179 x 1179' },
    { id: 'slide', size: '1920 x 1080' }
];

export const SHARE_RESOLUTIONS = [
    { id: 'standard', scale: 2, shortLabel: '1x' },
    { id: 'hd', scale: 3, shortLabel: '2x' },
    { id: 'print', scale: 4, shortLabel: '3x' }
];

export const SHARE_FORMATS = [
    { id: 'png', mime: 'image/png', ext: 'png' },
    { id: 'webp', mime: 'image/webp', ext: 'webp', quality: 0.92 }
];

export function getShareThemeSections() {
    return SHARE_THEME_SECTIONS.map((section) => ({
        ...section,
        themes: section.themeIds
            .map((themeId) => getShareThemeMeta(themeId))
            .filter(Boolean)
    }));
}

export function getShareThemeMeta(themeId) {
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

export function getShareLayoutMeta(layoutId) {
    return SHARE_LAYOUTS.find((layout) => layout.id === layoutId) || SHARE_LAYOUTS[0];
}

export function getShareResolutionMeta(resolutionId) {
    return SHARE_RESOLUTIONS.find((resolution) => resolution.id === resolutionId) || SHARE_RESOLUTIONS[1];
}

export function getShareFormatMeta(formatId) {
    return SHARE_FORMATS.find((format) => format.id === formatId) || SHARE_FORMATS[0];
}
