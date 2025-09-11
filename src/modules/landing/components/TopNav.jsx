import React from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../../../contexts/LanguageContext';

const TopNav = () => {
    const { t } = useLanguage();

    return (
        <nav className="fixed top-0 left-0 w-full z-[100] px-6 py-6 flex items-center justify-between pointer-events-none">
            {/* Logo - Allow clicking */}
            <Link to="/" className="text-2xl font-bold font-inter-tight tracking-tight text-white pointer-events-auto hover:opacity-80 transition-opacity">
                NexMap
            </Link>

            {/* Right Side - Links + Lang Switcher */}
            <div className="flex items-center gap-8 pointer-events-auto">
                <div className="flex items-center gap-4 md:gap-8 text-xs md:text-sm font-medium text-white/70">
                    <Link to="/about" className="hover:text-white transition-colors">About</Link>
                    <Link to="/history" className="hover:text-white transition-colors">History</Link>
                    <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                </div>

                <LanguageSwitcher />
            </div>
        </nav>
    );
};

export default TopNav;
