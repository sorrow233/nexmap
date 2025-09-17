import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Globe, ChevronDown, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { isLikelyChinaUser } from '../utils/regionCheck';
import PricingSection from '../modules/landing/components/PricingSection';
import SEO from '../components/SEO';

export default function PricingPage() {
    const { language, setLanguage, t } = useLanguage();
    const pricing = t.pricing;
    const [isBlocked, setIsBlocked] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);

    useEffect(() => {
        setIsBlocked(isLikelyChinaUser());
    }, []);

    const toggleLanguage = (lang) => {
        setLanguage(lang);
        setShowLangMenu(false);
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-slate-950 text-white overflow-x-hidden selection:bg-amber-500/30">
            <SEO title="Pricing" description="Flexible pricing for everyone. Start for free, upgrade for more power." />
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-600/10 rounded-full blur-[150px]" />
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[40%] h-[40%] bg-violet-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10">
                {/* Blocked Region Banner */}
                {isBlocked && (
                    <div className="bg-amber-600/20 border-b border-amber-500/20 backdrop-blur-md">
                        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-3 text-sm font-medium text-amber-200">
                            <AlertTriangle size={16} />
                            <span>{pricing.regionBlockedDesc}</span>
                        </div>
                    </div>
                )}

                {/* Header */}
                <header className="px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
                    <Link to="/" className="group flex items-center gap-3 text-white/60 hover:text-white transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                            <ArrowLeft size={16} />
                        </div>
                        <span className="font-medium text-sm">{pricing.backToNexMap}</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setShowLangMenu(!showLangMenu)}
                                className="flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-all"
                            >
                                <Globe size={12} />
                                <span className="uppercase">{language}</span>
                                <ChevronDown size={12} className={`transition-transform duration-200 ${showLangMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showLangMenu && (
                                <div className="absolute top-full right-0 mt-2 w-32 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                                    <button onClick={() => toggleLanguage('en')} className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">English</button>
                                    <button onClick={() => toggleLanguage('zh')} className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">中文</button>
                                    <button onClick={() => toggleLanguage('ja')} className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">日本語</button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
                            <Shield size={12} />
                            {pricing.securedByStripe}
                        </div>
                    </div>
                </header>

                <main className="pb-32">
                    <PricingSection showTitle={true} />
                </main>

                {/* Footer Trust */}
                <footer className="border-t border-white/5 bg-white/[0.02]">
                    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-8 text-white/30 text-sm">
                            <span className="flex items-center gap-2">
                                <Shield size={14} />
                                {pricing.ssl}
                            </span>
                            <span className="flex items-center gap-2">
                                <Globe size={14} />
                                {pricing.poweredByStripe}
                            </span>
                        </div>
                        <div className="flex gap-6 text-sm text-white/40">
                            <Link to="/legal/privacy" className="hover:text-white transition-colors">{pricing.privacy}</Link>
                            <Link to="/legal/terms" className="hover:text-white transition-colors">{pricing.terms}</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

