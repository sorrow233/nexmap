import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Brain, Zap, Infinity as InfinityIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function AboutPage() {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
                {/* Header */}
                <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-20 group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium tracking-wide">{t.aboutPage.backToHome}</span>
                </Link>

                {/* Main Content */}
                <article className="prose prose-invert prose-lg md:prose-xl max-w-none">
                    <div className="mb-24">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-mono mb-8">
                            <Sparkles size={12} />
                            <span>{t.aboutPage.manifesto}</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent mb-8">
                            {t.aboutPage.title}
                        </h1>
                        <p className="text-2xl md:text-3xl text-white/60 font-light leading-relaxed">
                            {t.aboutPage.subtitle}
                        </p>
                    </div>

                    <div className="space-y-40">
                        {/* Section 1 */}
                        <section className="relative group">
                            <div className="absolute -left-12 top-0 text-8xl font-black text-white/[0.02] -z-10 select-none group-hover:text-white/[0.04] transition-colors">01</div>
                            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-4">
                                <Brain className="text-indigo-400" size={28} />
                                {t.aboutPage.section1.title}
                            </h2>
                            <p className="text-white/70 leading-loose">
                                {t.aboutPage.section1.text}
                            </p>
                        </section>

                        {/* Section 2 */}
                        <section className="relative group">
                            <div className="absolute -left-12 top-0 text-8xl font-black text-white/[0.02] -z-10 select-none group-hover:text-white/[0.04] transition-colors">02</div>
                            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-4">
                                <Zap className="text-amber-400" size={28} />
                                {t.aboutPage.section2.title}
                            </h2>
                            <p className="text-white/70 leading-loose">
                                {t.aboutPage.section2.text}
                            </p>
                        </section>

                        {/* Section 3 */}
                        <section className="relative group">
                            <div className="absolute -left-12 top-0 text-8xl font-black text-white/[0.02] -z-10 select-none group-hover:text-white/[0.04] transition-colors">03</div>
                            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-4">
                                <InfinityIcon className="text-emerald-400" size={28} />
                                {t.aboutPage.section3.title}
                            </h2>
                            <p className="text-white/70 leading-loose">
                                {t.aboutPage.section3.text}
                            </p>
                            <p className="text-white/70 leading-loose mt-8">
                                {t.aboutPage.section3.extra}
                            </p>
                        </section>
                    </div>

                    <div className="mt-40 pt-20 border-t border-white/5 text-center">
                        <p className="text-white/30 text-sm font-mono">
                            {t.aboutPage.footer}
                        </p>
                    </div>
                </article>
            </div>
        </div>
    );
}
