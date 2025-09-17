import { Link } from 'react-router-dom';
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

            <div className="flex justify-center gap-8 mt-12 mb-8 text-base font-medium text-white/50">
                <Link to="/about" className="hover:text-white transition-colors">About</Link>
                <Link to="/history" className="hover:text-white transition-colors">History</Link>
                <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            </div>

            <div className="flex justify-center gap-6 text-sm text-slate-400">
                <a href="/legal/tokushoho" className="hover:text-white transition-colors">特定商取引法に基づく表記</a>
                <a href="/legal/terms" className="hover:text-white transition-colors">利用規約</a>
                <a href="/legal/privacy" className="hover:text-white transition-colors">プライバシーポリシー</a>
            </div>
            <div className="mt-8 text-white/20 text-sm">
                {t.footer.rights}
            </div>
        </div>
    );
};

export default FooterSection;
