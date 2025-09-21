import React from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SettingsGeneralTab() {
    const { language, setLanguage, t } = useLanguage();

    const languages = [
        { code: 'en', name: 'English', native: 'English' },
        { code: 'zh', name: 'Chinese', native: '简体中文' },
        { code: 'ja', name: 'Japanese', native: '日本語' }
    ];

    const handleLanguageChange = (code) => {
        setLanguage(code);
        // Persist to localStorage
        localStorage.setItem('userLanguage', code);

        // Cloud sync
        import('../../services/syncService').then(({ updateUserSettings }) => {
            import('../../services/firebase').then(({ auth }) => {
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
                    <Globe size={20} className="text-brand-500" />
                    {t.settings.language}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Choose your preferred language for the interface.
                </p>
            </div>

            {/* Language Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`relative group p-4 rounded-2xl border-2 transition-all duration-200 text-left ${language === lang.code
                            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/20'
                            : 'border-slate-100 dark:border-white/10 hover:border-brand-200 dark:hover:border-white/20 bg-white dark:bg-white/5'
                            }`}
                    >
                        {language === lang.code && (
                            <div className="absolute top-3 right-3 text-brand-500 bg-white dark:bg-brand-900 rounded-full p-1 shadow-sm">
                                <Check size={14} strokeWidth={3} />
                            </div>
                        )}

                        <div className={`text-lg font-bold mb-1 ${language === lang.code ? 'text-brand-700 dark:text-brand-100' : 'text-slate-700 dark:text-slate-200'
                            }`}>
                            {lang.native}
                        </div>
                        <div className={`text-xs font-medium ${language === lang.code ? 'text-brand-500 dark:text-brand-300' : 'text-slate-400'
                            }`}>
                            {lang.name}
                        </div>
                    </button>
                ))}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Note:</span>
                Changing the language will instantly update the user interface. Some AI-generated content (like existing cards) will remain in their original language.
            </div>
        </div>
    );
}
