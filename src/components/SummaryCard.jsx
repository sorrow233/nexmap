/**
 * SummaryCard.jsx
 * A dedicated component for rendering AI-generated text summaries.
 * Used when a board has a `summary` object but no background image.
 */

const THEME_COLORS = {
    blue: { gradient: 'from-blue-600/30 to-blue-900/60', accent: 'bg-blue-500' },
    purple: { gradient: 'from-purple-600/30 to-purple-900/60', accent: 'bg-purple-500' },
    emerald: { gradient: 'from-emerald-600/30 to-emerald-900/60', accent: 'bg-emerald-500' },
    orange: { gradient: 'from-orange-600/30 to-orange-900/60', accent: 'bg-orange-500' },
    pink: { gradient: 'from-pink-600/30 to-pink-900/60', accent: 'bg-pink-500' },
    slate: { gradient: 'from-slate-600/30 to-slate-900/60', accent: 'bg-slate-500' },
};

export default function SummaryCard({ summary }) {
    if (!summary) return null;

    const theme = THEME_COLORS[summary.theme] || THEME_COLORS.slate;

    return (
        <div className="absolute inset-0 bg-[#0d0d0d] flex flex-col">
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col h-full p-4 justify-between">
                {/* Summary Text */}
                <p className="text-sm font-medium text-white/90 leading-relaxed line-clamp-4">
                    {summary.summary}
                </p>

                {/* Accent Line */}
                <div className={`h-1 w-10 rounded-full ${theme.accent}`} />
            </div>
        </div>
    );
}
