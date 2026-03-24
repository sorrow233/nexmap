const CONNECTION_COLOR_KEYS = [
    'default',
    'red',
    'rose',
    'orange',
    'amber',
    'green',
    'emerald',
    'teal',
    'blue',
    'violet'
];

export function normalizeConnectionColorKey(color) {
    return CONNECTION_COLOR_KEYS.includes(color) ? color : 'default';
}

export function createConnectionStrokePalette(isDark) {
    return {
        default: isDark ? 'rgba(129, 140, 248, 0.4)' : 'rgba(99, 102, 241, 0.5)',
        red: isDark ? 'rgba(244, 63, 94, 0.7)' : 'rgba(244, 63, 94, 0.65)',
        rose: isDark ? 'rgba(244, 63, 94, 0.7)' : 'rgba(244, 63, 94, 0.65)',
        orange: isDark ? 'rgba(249, 115, 22, 0.7)' : 'rgba(249, 115, 22, 0.65)',
        amber: isDark ? 'rgba(245, 158, 11, 0.7)' : 'rgba(251, 191, 36, 0.65)',
        green: isDark ? 'rgba(34, 197, 94, 0.7)' : 'rgba(34, 197, 94, 0.65)',
        emerald: isDark ? 'rgba(34, 197, 94, 0.7)' : 'rgba(34, 197, 94, 0.65)',
        teal: isDark ? 'rgba(6, 182, 212, 0.7)' : 'rgba(6, 182, 212, 0.65)',
        blue: isDark ? 'rgba(59, 130, 246, 0.6)' : 'rgba(96, 165, 250, 0.6)',
        violet: isDark ? 'rgba(124, 58, 237, 0.6)' : 'rgba(167, 139, 250, 0.6)'
    };
}

export function createAggregatedStrokeGroups(pathCache) {
    const groupedPaths = new Map();

    for (const entry of pathCache.values()) {
        if (!entry?.path) continue;

        const colorKey = normalizeConnectionColorKey(entry.cardColor);
        let groupedPath = groupedPaths.get(colorKey);

        if (!groupedPath) {
            groupedPath = new Path2D();
            groupedPaths.set(colorKey, groupedPath);
        }

        groupedPath.addPath(entry.path);
    }

    return groupedPaths;
}
