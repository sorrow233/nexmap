import React, { useState, useEffect } from 'react';
import { FileText, Info, Sparkles, MessageSquare, Briefcase, Zap } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useStore } from '../../../store/useStore';
import { updateUserSettings } from '../../../services/syncService';
import { auth } from '../../../services/firebase';

export default function InstructionsSection() {
    const { t } = useLanguage();
    // Assuming customInstructions are stored in global store or user settings
    // Based on previous code, it seems it was passed as prop. 
    // We should bind it to the store/firebase like other settings.

    // Check if store has customInstructions, if not we might need to add it or fetch it.
    // For now let's assume useStore has it or we manage it locally then sync.
    const storedInstructions = useStore(state => state.customInstructions || '');
    const setStoreInstructions = useStore(state => state.setCustomInstructions);

    // We'll manage local state for the input and save on blur/change
    const [instructions, setInstructions] = useState(storedInstructions);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        setInstructions(storedInstructions);
    }, [storedInstructions]);

    const handleSave = async (newVal) => {
        setInstructions(newVal);
        if (setStoreInstructions) setStoreInstructions(newVal);

        // Persist to cloud
        if (auth?.currentUser) {
            try {
                await updateUserSettings(auth.currentUser.uid, { customInstructions: newVal });
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 2000);
            } catch (e) {
                console.error("Failed to save instructions", e);
            }
        } else {
            localStorage.setItem('customInstructions', newVal);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        }
    };

    const templates = [
        {
            icon: MessageSquare,
            label: 'Casual Helper',
            text: 'You are a friendly and casual AI assistant. Use emojis occasionally. Keep answers concise and direct. Avoid jargon unless asked.'
        },
        {
            icon: Briefcase,
            label: 'Professional Coder',
            text: 'You are an expert software engineer. Focus on clean, efficient, and well-documented code. Explain complex concepts clearly. Prefer functional programming patterns.'
        },
        {
            icon: Zap,
            label: 'Bullet Point Summary',
            text: 'Always structure your responses with bullet points. Be extremely concise. Highlight key terms in bold. Avoid fluff.'
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                    <Sparkles size={20} className="text-purple-500" />
                    {t.settings?.customInstructions || 'Custom Instructions'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {t.settings?.customInstructionsHelp || 'Define how the AI should behave across all your boards.'}
                </p>
            </div>

            <div className="flex gap-6 flex-col lg:flex-row">
                {/* Main Input Area */}
                <div className="flex-1 space-y-4">
                    <div className="relative group">
                        <textarea
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            onBlur={(e) => handleSave(e.target.value)}
                            placeholder="e.g., Always answer in French, or Act as a senior React developer..."
                            className="w-full h-[400px] p-6 bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 rounded-2xl 
                                text-slate-800 dark:text-slate-200 placeholder-slate-400 
                                focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all
                                resize-none custom-scrollbar text-base leading-relaxed font-mono shadow-sm"
                        />
                        <div className={`absolute bottom-4 right-4 text-xs font-bold transition-all duration-300 ${isSaved ? 'text-emerald-500 opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                            Saved
                        </div>
                    </div>
                </div>

                {/* Sidebar / Templates */}
                <div className="w-full lg:w-[280px] space-y-4">
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-500/20">
                        <div className="flex items-start gap-3">
                            <Info size={16} className="text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">
                                {t.settings?.customInstructionsInfo || 'These instructions are prepended to every message you send to the AI models.'}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block px-1">Quick Templates</label>
                        <div className="space-y-2">
                            {templates.map((tpl, idx) => {
                                const Icon = tpl.icon;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleSave(tpl.text)}
                                        className="w-full p-3 flex items-start gap-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:border-purple-300 dark:hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group text-left"
                                    >
                                        <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg group-hover:bg-white dark:group-hover:bg-purple-500/20 transition-colors">
                                            <Icon size={16} className="text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-300" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-purple-700 dark:group-hover:text-purple-200">{tpl.label}</div>
                                            <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{tpl.text}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
