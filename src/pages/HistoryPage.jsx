import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GitCommit, Calendar, Tag, Activity } from 'lucide-react';
import SEO from '../components/SEO';

export default function HistoryPage() {
    // Real changelog derived from actual git history
    // Real changelog derived from actual git history
    // Real changelog derived from actual git history
    const changes = [
        {
            date: "Jan 06, 2026",
            version: "2.2.8",
            title: "Global Intelligence & SEO",
            items: [
                "Implemented full-stack localized SEO (Hreflang) for EN/ZH/JA/KO/TW",
                "Launched 'Manifesto' About page with bilingual support",
                "Added neural usage analytics: Client-side token/character tracking & daily stats",
                "Refined 'Branch' engine: Now uses AI to intelligently segment topics instead of regex",
                "Visual Overhaul: New Bento Grid landing animations & simplified pricing flow"
            ]
        },
        {
            date: "Jan 06, 2026",
            version: "2.2.7",
            title: "Core Experience",
            items: [
                "Feature: Added 'Reference Index' sidebar for quick chat navigation",
                "Fix: Resolved StickyNote persistence issues (delete/edit/duplicate bugs)",
                "Performance: Auto-background generation for large boards (>10 cards)",
                "AI: Enhanced Irasutoya prompt engineering for complex scene composition",
                "UX: Decoupled 'New Note' creation for faster ideation"
            ]
        },
        {
            date: "Jan 05, 2026",
            version: "2.2.1",
            title: "Mobile & Infrastructure",
            items: [
                "Mobile: Implemented long-press multi-select for touch interfaces",
                "Layout: Optimized mobile bottom bar to prevent overlapping",
                "Commerce: Added Order Number system & validated Payment Success modal",
                "Security: Audit & removal of sensitive logs from settings",
                "Bumped core version to 2.2 series"
            ]
        },
        {
            date: "Jan 04, 2026",
            version: "2.1.4",
            title: "Stability Protocol",
            items: [
                "Core: Removed artificial context truncation limits for larger models",
                "Fix: Model switching now correctly applies to pre-existing cards",
                "Fix: 'Edit Prompt' persistence issues resolved",
                "Fix: React error #310 in Zone component resolved during high-concurrency"
            ]
        },
        {
            date: "Jan 03, 2026",
            version: "2.1.1",
            title: "Identity & Sync",
            items: [
                "Rebranding: Updated all app icons to new NexMap visual identity",
                "Sync: Fixed Board Prompts (tags) cloud synchronization",
                "Localization: Fixed Mac IME positioning bugs in Sidebar inputs",
                "Export: Corrected logo watermark in exported images"
            ]
        },
        {
            date: "Jan 03, 2026",
            version: "2.1.0",
            title: "The Spatial Update",
            items: [
                "Major: Redesigned Sidebar to floating Notion-style tags",
                "Feature: Added 'Zone' for semantic spatial grouping",
                "Feature: Prompt Sidebar with Drag-and-Drop capability",
                "Fix: Resolved infinite render loop in BoardPage"
            ]
        },
        {
            date: "Dec 31, 2025",
            version: "2.0.0",
            title: "NexMap 2.0: Sprout",
            items: [
                "New Feature: Quick Sprout for one-click recursive topic decomposition",
                "AI Strategy: Implemented 'Curiosity Maximization' prompt chains",
                "Layout: Standardized mindmap auto-layout for Sprout/Branch",
                "Physics: Added collision detection for non-overlapping card placement"
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
