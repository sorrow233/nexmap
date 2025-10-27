import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GitCommit, Calendar, Tag, Activity } from 'lucide-react';
import SEO from '../components/SEO';

export default function HistoryPage() {
    // Real changelog derived from actual git history
    // Real changelog derived from actual git history
    const changes = [
        {
            date: "Jan 06, 2026",
            version: "0.0.28",
            title: "Global SEO & Intelligence",
            items: [
                "Implemented localized SEO (Hreflang) strategies for EN/ZH/JA/KO/TW",
                "Added 'Manifesto' style About page with bilingual support",
                "Client-side token/character usage tracking & daily stats panel",
                "Refined 'Branch' feature to use AI for intelligent topic splitting",
                "Optimized landing page animations (Bento Grid) & removed pricing section"
            ]
        },
        {
            date: "Jan 06, 2026",
            version: "0.0.27",
            title: "Gallery & Core Features",
            items: [
                "Added Chat Message Previews in sidebar (Reference Index)",
                "Fixed StickyNote bugs (delete, edit, single-instance restrictions)",
                "Implemented auto-background generation for large boards (>10 cards)",
                "Enhanced Irasutoya image prompts for complex scene generation",
                "Added independent 'New Note' creation logic"
            ]
        },
        {
            date: "Jan 05, 2026",
            version: "0.0.26",
            title: "Infrastructure & Mobile",
            items: [
                "Bumped version to v2.2.1",
                "Implemented long-press multi-select for touch devices",
                "Optimized mobile bottom button layout to avoid overlap",
                "Added Order Number system & Payment Success modal",
                "Security fix: Removed sensitive logs from settings"
            ]
        },
        {
            date: "Jan 04, 2026",
            version: "0.0.25",
            title: "Stability & Fixes",
            items: [
                "Fixed context truncation limit (removed artificial cap)",
                "Fixed model switching for existing cards",
                "Fixed 'Edit Prompt' saving issue",
                "Resolved React error #310 in Zone component"
            ]
        },
        {
            date: "Jan 03, 2026",
            version: "0.0.24",
            title: "Sidebar & Zone",
            items: [
                "Redesigned Sidebar to floating Notion-style tags",
                "Added Zone button for quick card grouping",
                "Implemented Prompt Sidebar with Drag-and-Drop",
                "Fixed infinite loop bug in BoardPage"
            ]
        },
        {
            date: "Dec 31, 2025",
            version: "0.0.23",
            title: "Sprout & Branch",
            items: [
                "Added Quick Sprout for one-click topic decomposition",
                "Implemented 'Curiosity Maximization' prompt strategy",
                "Standard mindmap layout for Sprout/Branch",
                "Added collision detection for new card placement"
            ]
        },
        {
            date: "Dec 31, 2025",
            version: "0.0.22",
            title: "Image & Export",
            items: [
                "Refined image generation with Irasutoya style prompts",
                "Fixed iPad Safari image export issues",
                "Added user custom instructions support",
                "Modularized Gemini provider for better error handling"
            ]
        },
        {
            date: "Dec 30, 2025",
            version: "0.0.21",
            title: "Gallery Modernization",
            items: [
                "Modernized Gallery UI with glassmorphism",
                "Resolved scrolling issues on mobile",
                "Added auto-retry (max 2) for API errors",
                "Enabled manual language switching via settings"
            ]
        },
        {
            date: "Dec 29, 2025",
            version: "0.0.19",
            title: "AI Manager",
            items: [
                "Fixed Gemini 400 validation errors",
                "Resolved AIManager message loss issue",
                "Sanitized image data for API compatibility"
            ]
        },
        {
            date: "Dec 28, 2025",
            version: "0.0.17",
            title: "Security & Backup",
            items: [
                "Added 5-day timed sync rollback feature",
                "Fixed data clearing bug on login",
                "Introduced logout safety lock",
                "Made manual JSON import always visible for recovery"
            ]
        },
        {
            date: "Dec 28, 2025",
            version: "0.0.16",
            title: "Localization",
            items: [
                "Localized Pricing page content (EN, ZH, JA)",
                "Added Tokushoho and Privacy Policy pages",
                "Implemented region-based access restriction"
            ]
        },
        {
            date: "Dec 27, 2025",
            version: "0.0.15",
            title: "Stability",
            items: [
                "Fixed ghost logout issues",
                "Prevented welcome popup from reappearing",
                "Optimized code structure"
            ]
        },
        {
            date: "Nov 2025",
            version: "0.0.1",
            title: "Initial Release",
            items: [
                "Basic infinite canvas functionality",
                "Real-time Google Firebase sync",
                "Markdown support in cards",
                "Multi-modal AI chat integration"
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30">
            <SEO title="Changelog" description="See what's new in NexMap. A transparent look at our development journey." />

            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] bg-blue-900/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">
                {/* Header */}
                <div className="flex items-center justify-between mb-20">
                    <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium tracking-wide">BACK TO HOME</span>
                    </Link>
                    <div className="flex items-center gap-2 text-white/20 text-sm font-mono">
                        <Activity size={14} />
                        <span>CHANGELOG</span>
                    </div>
                </div>

                <div className="mb-24">
                    <h1 className="text-5xl font-bold tracking-tight mb-6">
                        Evolution of <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">NexMap</span>
                    </h1>
                    <p className="text-xl text-white/50 max-w-2xl">
                        A transparent look at our journey from a rough prototype to a spatial thinking engine. We ship fast and iterate often.
                    </p>
                </div>

                {/* Timeline */}
                <div className="relative border-l border-white/10 ml-3 md:ml-6 space-y-16">
                    {changes.map((change, index) => (
                        <div key={index} className="relative pl-8 md:pl-12 group">
                            {/* Dot */}
                            <div className="absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-[#050505] group-hover:bg-cyan-400 transition-colors" />

                            {/* Content */}
                            <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-4 mb-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                                        {change.title}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-2 text-xs font-mono text-white/40 uppercase tracking-wider">
                                        <span className="flex items-center gap-1">
                                            <Tag size={10} />
                                            {change.version}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                        <span className="flex items-center gap-1">
                                            <Calendar size={10} />
                                            {change.date}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <ul className="space-y-3">
                                {change.items.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-white/70">
                                        <GitCommit size={16} className="mt-1 text-white/20 shrink-0" />
                                        <span className="leading-relaxed">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-24 pt-12 border-t border-white/5 text-center text-white/20 text-sm">
                    <p>End of records. The journey continues.</p>
                </div>
            </div>
        </div>
    );
}
