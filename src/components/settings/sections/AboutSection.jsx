import React from 'react';
import { Gift, ExternalLink, Heart, Shield, FileText } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

export default function AboutSection() {
    const { t } = useLanguage();

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                    <Gift size={20} className="text-pink-500" />
                    {t.settings.about || 'About & Credits'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {t.settings.creditsDesc || 'Information about the project and legal terms.'}
                </p>
            </div>

            {/* Links Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a href="/legal/terms" target="_blank" className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white dark:bg-white/10 rounded-lg text-slate-600 dark:text-slate-300 group-hover:text-indigo-500 transition-colors">
                            <FileText size={18} />
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{t.settings.terms || 'Terms of Service'}</span>
                    </div>
                    <p className="text-xs text-slate-500">Read our usage conditions</p>
                </a>

                <a href="/legal/privacy" target="_blank" className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white dark:bg-white/10 rounded-lg text-slate-600 dark:text-slate-300 group-hover:text-emerald-500 transition-colors">
                            <Shield size={18} />
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{t.settings.privacy || 'Privacy Policy'}</span>
                    </div>
                    <p className="text-xs text-slate-500">How we handle your data</p>
                </a>
            </div>

            {/* Version Info */}
            <div className="p-6 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-xl shadow-slate-900/10">
                <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Version</div>
                    <div className="text-2xl font-black tracking-tight font-mono">v2.1.5 <span className="text-sm font-normal text-slate-500 ml-1">Beta</span></div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-slate-400">Build 2026.01.09</div>
                    <div className="text-xs text-slate-500 mt-1">MixBoard Engine</div>
                </div>
            </div>

            <div className="flex justify-center pt-8 opacity-50 hover:opacity-100 transition-opacity">
                <p className="text-xs text-slate-400 flex items-center gap-1">
                    Made with <Heart size={10} className="fill-red-500 text-red-500" /> by Antigravity
                </p>
            </div>
        </div>
    );
}
