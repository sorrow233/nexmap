import React from 'react';
import { BarChart3, ChevronDown, CreditCard, LayoutGrid, LogOut, MessageSquare, Settings, Star, StickyNote, Trash2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getMobileGalleryCopy } from './mobileGalleryCopy';

const iconMap = {
    active: LayoutGrid,
    notes: StickyNote,
    favorites: Star,
    statistics: BarChart3,
    trash: Trash2,
    feedback: MessageSquare
};

export default function MobileGalleryHeader({
    activeTab,
    navItems,
    navigate,
    user,
    t,
    onLogin,
    onLogout,
    onOpenSettings,
    showUserMenu,
    setShowUserMenu
}) {
    const { language } = useLanguage();
    const copy = getMobileGalleryCopy(language);
    const closeMenu = () => setShowUserMenu(false);

    const handlePricing = () => {
        closeMenu();
        navigate('/pricing');
    };

    const handleSettings = () => {
        closeMenu();
        onOpenSettings();
    };

    const handleLogout = () => {
        closeMenu();
        onLogout('manual_user_click');
    };

    return (
        <div className="md:hidden relative z-30 mb-4 px-1">
            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => navigate('/gallery')}
                    className="flex min-w-0 items-center gap-3 text-left"
                >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-white text-slate-950 shadow-[0_18px_34px_-20px_rgba(255,255,255,0.45)]">
                        <Star size={20} fill="currentColor" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-[1.5rem] font-black tracking-[-0.06em] text-white">
                            NexMap
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            {copy.homeLabel}
                        </div>
                    </div>
                </button>

                {user ? (
                    <div className="relative shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            aria-label="User Menu"
                            className="flex h-11 items-center gap-2 rounded-full bg-white/[0.04] px-1.5 pr-3 text-white/75 ring-1 ring-white/8"
                        >
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    className="h-8 w-8 rounded-full object-cover ring-2 ring-white/10"
                                    alt="User"
                                />
                            ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-xs font-black text-white">
                                    {user.displayName?.[0] || 'U'}
                                </div>
                            )}
                            <ChevronDown
                                size={14}
                                className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {showUserMenu && (
                            <>
                                <div className="fixed inset-0 z-[100]" onClick={closeMenu} />
                                <div className="absolute right-0 top-full z-[101] mt-3 w-56 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#10172a] p-2 shadow-[0_24px_80px_-36px_rgba(2,8,23,0.95)]">
                                    <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                                        {t.gallery?.account || 'Account'}
                                    </div>
                                    <button
                                        onClick={handlePricing}
                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/[0.05]"
                                    >
                                        <CreditCard size={16} />
                                        {t.gallery?.pricing || 'Pricing'}
                                    </button>
                                    <button
                                        onClick={handleSettings}
                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/[0.05]"
                                    >
                                        <Settings size={16} />
                                        {t.settings?.title || 'Settings'}
                                    </button>
                                    <div className="my-1 h-px bg-white/6" />
                                    <button
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-300 transition hover:bg-rose-500/10"
                                    >
                                        <LogOut size={16} />
                                        {t.gallery?.signOut || 'Sign Out'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onLogin}
                        className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950"
                    >
                        {t.gallery?.signIn || 'Sign In'}
                    </button>
                )}
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {navItems.map((tab) => {
                    const Icon = iconMap[tab.id] || LayoutGrid;
                    const isActive = activeTab === tab.id;

                    return (
                        <NavLink
                            key={tab.id}
                            to={tab.path}
                            end={tab.end}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold tracking-tight transition-all ${isActive
                                ? 'bg-white text-slate-950 shadow-[0_16px_30px_-22px_rgba(255,255,255,0.6)]'
                                : 'bg-white/[0.04] text-slate-300 ring-1 ring-white/8'
                                }`}
                        >
                            <Icon size={15} strokeWidth={2.2} className={isActive ? 'text-slate-950' : 'text-slate-500'} />
                            <span>{tab.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        </div>
    );
}
