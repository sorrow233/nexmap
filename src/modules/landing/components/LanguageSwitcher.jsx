import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

const LanguageSwitcher = () => {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'zh', label: '中文' },
        { code: 'ja', label: '日本語' }
    ];

    const currentLang = languages.find(l => l.code === language) || languages[0];

    return (
        <div
            className="fixed top-6 right-6 z-50 flex flex-col items-end"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            {/* Toggle Button */}
            <button
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-xl transition-all duration-300
                    ${isOpen
                        ? 'bg-white/10 border-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'}
                `}
            >
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium tracking-wide">{currentLang.label}</span>
            </button>

            {/* Dropdown Menu */}
            <div
                className={`
                    absolute top-full mt-2 w-32 py-2 rounded-xl border border-white/10 bg-[#0A0A0A]/90 backdrop-blur-2xl shadow-2xl
                    transform transition-all duration-300 origin-top-right
                    ${isOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}
                `}
            >
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => {
                            setLanguage(lang.code);
                            setIsOpen(false);
                        }}
                        className={`
                            w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between group
                            ${language === lang.code ? 'text-blue-400 bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                        `}
                    >
                        <span>{lang.label}</span>
                        {language === lang.code && (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LanguageSwitcher;
