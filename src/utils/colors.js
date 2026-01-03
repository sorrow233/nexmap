// Shared vibrant colors for Tags, Prompts, and Chips
// Notion-like clear vibrant colors
export const TAG_COLORS = [
    'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
    'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 border-sky-200 dark:border-sky-500/20',
    'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
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
