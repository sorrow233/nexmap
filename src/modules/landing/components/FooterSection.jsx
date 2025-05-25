import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

const FooterSection = () => {
    const { t } = useLanguage();

    return (
        <div className="py-24 bg-black border-t border-white/10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-900/5 blur-3xl pointer-events-none" />

            <h2 className="text-4xl md:text-5xl font-bold mb-8 relative z-10">{t.footer.title}</h2>
            <button
                onClick={() => window.location.href = '/gallery'}
                className="px-12 py-4 bg-white text-black rounded-full text-lg font-bold hover:scale-105 transition-transform hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] relative z-10"
            >
                {t.footer.cta}
            </button>
            <div className="mt-12 text-white/20 text-sm">
                {t.footer.rights}
            </div>
        </div>
    );
};

export default FooterSection;
