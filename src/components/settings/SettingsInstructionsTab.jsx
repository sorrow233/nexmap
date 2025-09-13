import React from 'react';
import { FileText, Info } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SettingsInstructionsTab({ customInstructions, setCustomInstructions }) {
    const { t } = useLanguage();
    const maxLength = 2000;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                    <FileText size={20} className="text-brand-500" />
                    {t.settings?.customInstructions || 'Custom Instructions'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {t.settings?.customInstructionsHelp || 'Instructions you add here will be included in every AI interaction across all cards and canvases.'}
                </p>
            </div>

            {/* Instructions Input */}
            <div className="space-y-3">
                <div className="relative">
                    <textarea
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value.slice(0, maxLength))}
                        placeholder={t.settings?.customInstructionsPlaceholder || 'Example: Always respond in a friendly, casual tone. Use bullet points for lists. Prefer concise answers.'}
                        className="w-full h-48 p-4 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl 
                            text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500
                            focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all
                            resize-none custom-scrollbar font-sans text-sm leading-relaxed"
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-slate-400 dark:text-slate-500 font-mono">
                        {customInstructions?.length || 0} / {maxLength}
                    </div>
                </div>
            </div>

            {/* Info Card */}
            <div className="p-4 bg-brand-50/50 dark:bg-brand-900/10 rounded-xl border border-brand-100 dark:border-brand-500/20 flex gap-3">
                <Info size={18} className="text-brand-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <p className="font-bold text-brand-700 dark:text-brand-300 mb-1">
                        {t.settings?.customInstructionsNote || 'How it works'}
                    </p>
                    {t.settings?.customInstructionsInfo || 'Your instructions are prepended to every AI request. Use them to set language preferences, response styles, or domain-specific context that should apply globally.'}
                </div>
            </div>

            {/* Examples */}
            <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t.settings?.exampleInstructions || 'Example Instructions'}
                </p>
                <div className="grid gap-2">
                    {[
                        t.settings?.exampleInstruction1 || 'Always respond in Japanese',
                        t.settings?.exampleInstruction2 || 'I am a software engineer, use technical terms',
                        t.settings?.exampleInstruction3 || 'Keep responses under 200 words'
                    ].map((example, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCustomInstructions(prev => prev ? `${prev}\n${example}` : example)}
                            className="text-left px-4 py-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 
                                rounded-xl text-sm text-slate-600 dark:text-slate-300 transition-colors
                                border border-slate-100 dark:border-white/5 hover:border-brand-200 dark:hover:border-brand-500/30"
                        >
                            + {example}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
