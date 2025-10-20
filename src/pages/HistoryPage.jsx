import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GitCommit, Calendar, Tag, Activity } from 'lucide-react';
import SEO from '../components/SEO';
import { useLanguage } from '../contexts/LanguageContext';

export default function HistoryPage() {
    const { t } = useLanguage();
    const changes = t.historyPage.changes;

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30">
            <SEO title={t.historyPage.seoTitle} description={t.historyPage.seoDesc} />

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
                        <span className="text-sm font-medium tracking-wide">{t.historyPage.backToHome}</span>
                    </Link>
                    <div className="flex items-center gap-2 text-white/20 text-sm font-mono">
                        <Activity size={14} />
                        <span>{t.historyPage.label}</span>
                    </div>
                </div>

                <div className="mb-24">
                    <h1 className="text-5xl font-bold tracking-tight mb-6">
                        {t.historyPage.titlePrefix} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{t.historyPage.titleHighlight}</span>
                    </h1>
                    <p className="text-xl text-white/50 max-w-2xl">
                        {t.historyPage.subtitle}
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
                    <p>{t.historyPage.endOfRecords}</p>
                </div>
            </div>
        </div>
    );
}
