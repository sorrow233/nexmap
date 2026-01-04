// Shared vibrant colors for Tags, Prompts, and Chips
// Notion-like clear vibrant colors
// Premium, balanced colors for both light and dark modes
export const TAG_COLORS = [
    // Soft Rose
    'bg-rose-50/80 text-rose-600 border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    // Warm Amber
    'bg-amber-50/80 text-amber-700 border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    // Fresh Emerald
    'bg-emerald-50/80 text-emerald-700 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    // Sky Blue
    'bg-sky-50/80 text-sky-600 border-sky-200/50 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
    // Elegant Indigo
    'bg-indigo-50/80 text-indigo-600 border-indigo-200/50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    // Sophisticated Violet
    'bg-violet-50/80 text-violet-600 border-violet-200/50 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
];

export const getRandomColor = () => TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

// Deterministic color based on string content
export const getColorForString = (str) => {
    if (!str) return TAG_COLORS[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};
