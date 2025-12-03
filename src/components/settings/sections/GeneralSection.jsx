import React from 'react';
import { Globe, Check, Moon, Sun, Smartphone } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useStore } from '../../../store/useStore';

export default function GeneralSection() {
    const { language, setLanguage, t } = useLanguage();
    // Assuming we might have a theme context or store later, but for now just language

    // We can add Theme Toggles here if the app supports it via store/context
    // For now, based on App.jsx, it seems dark mode uses system or class strategy.
    // Let's stick to Language for now as per original GeneralTab.

    const languages = [
        { code: 'en', name: 'English', native: 'English' },
        { code: 'zh', name: 'Chinese', native: '简体中文' },
        { code: 'ja', name: 'Japanese', native: '日本語' },
        { code: 'ko', name: 'Korean', native: '한국어' }
    ];

    const handleLanguageChange = (code) => {
        setLanguage(code);
        localStorage.setItem('userLanguage', code);

        // Sync logic is handled in the modal save or auto-sync?
        // Original code did it inline. Ideally we update local state and let the main save handler do it
        // BUT language is often immediate.

        // Let's duplicate the sync call for immediate effect or trust the modal save?
        // Modal save is better for batching, BUT language switch usually needs immediate feedback.
        // Let's keep it immediate for UI feedback, but maybe suppress the sync until "Save"?
        // Actually, user expects language to change immediately.

        import('../../../services/syncService').then(({ updateUserSettings }) => {
            import('../../../services/firebase').then(({ auth }) => {
                if (auth?.currentUser) {
                    updateUserSettings(auth.currentUser.uid, { userLanguage: code });
                }
            });
        });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                    <Globe size={20} className="text-indigo-500" />
                    {t.settings.language || 'Language'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {t.settings.languageChoose || 'Choose your preferred language for the interface.'}
                </p>
            </div>

            {/* Language Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`
                            relative group p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-center justify-between
                            ${language === lang.code
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-slate-100 dark:border-white/10 hover:border-indigo-200 dark:hover:border-white/20 bg-white dark:bg-white/5'
                            }
                        `}
                    >
                        <div>
                            <div className={`text-base font-bold mb-0.5 ${language === lang.code ? 'text-indigo-700 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-200'}`}>
                                {lang.native}
                            </div>
                            <div className={`text-xs font-medium ${language === lang.code ? 'text-indigo-500 dark:text-indigo-300' : 'text-slate-400'}`}>
                                {lang.name}
                            </div>
                        </div>

                        {language === lang.code && (
                            <div className="text-indigo-500 bg-white dark:bg-indigo-900 rounded-full p-1 shadow-sm">
                                <Check size={16} strokeWidth={3} />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-bold block mb-1 text-slate-700 dark:text-slate-300">{t.settings.languageNote || 'Note'}</span>
                {t.settings.languageNoteDesc || 'Translations are AI-assisted and may continue to improve over time.'}
            </div>
        </div>
    );
}
