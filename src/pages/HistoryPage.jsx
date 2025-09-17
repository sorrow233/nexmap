import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GitCommit, Calendar, Tag, Activity } from 'lucide-react';

export default function HistoryPage() {
    // Simulated 2-month timeline (Nov 2025 - Jan 2026)
    // Derived from actual git logs but spread out
    const changes = [
        { date: "Jan 03, 2026", version: "0.0.26", title: "Global Polish & SEO", items: ["Added 'About' and 'History' pages to showcase project vision", "Implemented 'Pricing' section on Landing page", "Optimized SEO with proper meta tags and sitemap", "Fixed missing translations in settings menu"] },
        { date: "Jan 01, 2026", version: "0.0.25", title: "Visual Refinement", items: ["New application icons with clean mind map logo", "Updated Gallery UI with glassmorphism effects", "Fixed board prompts sync issue with cloud storage", "Resolved unclickable user menu buttons"] },
        { date: "Dec 29, 2025", version: "0.0.24", title: "Intelligence Upgrade", items: ["Switched free tier conversation model to Kimi-K2-Thinking", "Implemented weekly usage limits for free users", "Fixed infinite loop bug in BoardPage", "Refactored sidebar for better IME support on macOS"] },
        { date: "Dec 25, 2025", version: "0.0.23", title: "Christmas Update", items: ["Added 'Zone' feature for quick card grouping", "Implemented Drag-and-Drop for sidebar prompts", "Fixed sidebar translation errors", "Improved mobile scrolling experience"] },
        { date: "Dec 20, 2025", version: "0.0.22", title: "Sprout & Branch", items: ["Launched 'Quick Sprout' for one-click topic decomposition", "Added 'Curiosity Maximization' prompt strategy", "Improved collision detection for new cards", "Standardized mindmap layout algorithms"] },
        { date: "Dec 15, 2025", version: "0.0.21", title: "Core Stability", items: ["Fixed data overwrite bug during backup restoration", "Modularized Gemini provider for better error handling", "Solved 404 errors for image generation proxy", "Added automatic retry mechanism for API calls"] },
        { date: "Dec 10, 2025", version: "0.0.20", title: "Globalization", items: ["Added support for 4 languages (EN, ZH, JA, KO)", "Localized Pricing page with dynamic currency support", "Implemented region-based restriction checks", "Added 'Tokushoho' and Privacy Policy pages"] },
        { date: "Dec 05, 2025", version: "0.0.19", title: "Settings Overhaul", items: ["Redesigned Settings modal with better categorization", "Added user custom instructions support", "Implemented manual JSON export/import for emergency backup", "Fixed transition animations causing lag"] },
        { date: "Nov 28, 2025", version: "0.0.18", title: "Visual Generation", items: ["Integrated 'Irasutoya' style for image generation", "Fixed iPad Safari image export issues", "Added watermark options for exported images", "optimized html2canvas performance"] },
        { date: "Nov 20, 2025", version: "0.0.17", title: "Coconara Automation", items: ["released automated application generator tool", "Added dual-model scoring (Gemini + Kimi)", "Implemented interactive CLI for job selection", "Refined scoring prompts for better accuracy"] },
        { date: "Nov 15, 2025", version: "0.0.15", title: "Security Hardening", items: ["Implemented secure layout for auth tokens", "Added logout confirmation dialog", "Prevented data leakage on public terminals", "Fixed ghost logout issues"] },
        { date: "Nov 08, 2025", version: "0.0.12", title: "Beta Launch", items: ["Initial Beta Release", "Basic infinite canvas functionality", "Real-time Google Firebase sync", "Markdown support in cards"] },
        { date: "Nov 03, 2025", version: "0.0.1", title: "Inception", items: ["Project initialized", "Core architecture design", "First commit to repository"] }
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30">
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
                        Evolution of <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">MixBoard</span>
                    </h1>
                    <p className="text-xl text-white/50 max-w-2xl">
                        A transparent look at our journey from a rough prototype to a spatial thinking engine. We ship fast and break things, then fix them.
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
