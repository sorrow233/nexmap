import React, { useState, useEffect } from 'react';
import { Plus, Settings, Star, MessageSquare, CreditCard, LogOut, ChevronDown, User, Sparkles, BarChart3, Sun, Moon } from 'lucide-react';
import BoardGallery from '../components/BoardGallery';
import FavoritesGallery from '../components/FavoritesGallery';
import FeedbackView from '../components/FeedbackView';
import SettingsModal from '../components/SettingsModal';
import UsageStatsModal from '../components/UsageStatsModal';
import StatisticsView from '../components/StatisticsView';
import SEO from '../components/SEO';
import Spotlight from '../components/shared/Spotlight';
import { getGuideBoardData } from '../utils/guideBoardData';
import { createBoard, saveBoard, updateUserSettings, loadUserSettings } from '../services/storage';
import { useNavigate, useSearchParams, NavLink, Routes, Route, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

import { useStore } from '../store/useStore';
import ProBadge from '../components/ProBadge';
import PaymentSuccessModal from '../components/PaymentSuccessModal';
import { auth } from '../services/firebase';
import { useAutoBoardSummaries } from '../hooks/useAutoBoardSummaries';

export default function GalleryPage({
    boardsList,
    onCreateBoard,
    onSelectBoard,
    onDeleteBoard,
    onRestoreBoard,
    onPermanentlyDeleteBoard,
    onUpdateBoardMetadata,
    user,
    onLogin,
    onLogout
}) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [paymentSuccessOpen, setPaymentSuccessOpen] = useState(false);
    const [orderDetails, setOrderDetails] = useState(null);
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const isPro = useStore(state => state.isPro);
    const refreshCredits = useStore(state => state.fetchSystemCredits);


    // Auto-generate summaries for eligible boards
    useAutoBoardSummaries(boardsList, onUpdateBoardMetadata);


    // Detect payment success from URL
    useEffect(() => {
        const paymentStatus = searchParams.get('payment');
        const sessionId = searchParams.get('session_id');

        if (paymentStatus === 'success' && sessionId && user) {
            // Fetch order details
            const fetchOrderDetails = async () => {
                try {
                    const token = await auth.currentUser?.getIdToken();
                    if (!token) return;

                    const res = await fetch(`/api/order-details?session_id=${sessionId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setOrderDetails(data);
                        setPaymentSuccessOpen(true);
                        // Refresh credits after successful payment
                        if (refreshCredits) refreshCredits(user.uid);
                    }
                } catch (err) {
                    console.error('Failed to fetch order details:', err);
                }
            };

            fetchOrderDetails();

            // Clean up URL parameters
            searchParams.delete('payment');
            searchParams.delete('session_id');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, user, setSearchParams, refreshCredits]);



    const handleCreateGuide = async () => {
        const guideTitle = "NexMap 使用指南 🚀";
        const existingBoard = boardsList.find(b => b.name === guideTitle && !b.deletedAt);
        if (existingBoard) {
            onSelectBoard(existingBoard.id);
            return;
        }
        const newBoard = await createBoard(guideTitle);
        const guideContent = getGuideBoardData();
        await saveBoard(newBoard.id, guideContent);
        onSelectBoard(newBoard.id);
    };

    // DEFENSIVE: Ensure boardsList is an array
    const validBoardsList = Array.isArray(boardsList) ? boardsList : [];

    const activeBoards = validBoardsList.filter(b => !b.deletedAt);
    const trashBoards = validBoardsList.filter(b => b.deletedAt);

    // Helper to determine active tab for styling
    // If path is exactly /gallery or /, active is 'active'
    // If path includes /gallery/favorites, active is 'favorites' etc.
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/favorites')) return 'favorites';
        if (path.includes('/statistics')) return 'statistics';
        if (path.includes('/trash')) return 'trash';
        if (path.includes('/feedback')) return 'feedback';
        return 'active';
    };

    const activeTab = getActiveTab();



    const navItems = [
        { id: 'active', label: t.gallery.gallery, path: '/gallery', end: true },
        { id: 'favorites', label: t.gallery.favorites, icon: Star, path: '/gallery/favorites' },
        { id: 'statistics', label: t.stats?.title || "Data", icon: BarChart3, path: '/gallery/statistics' },
        { id: 'trash', label: t.gallery.trash, path: '/gallery/trash' },
        { id: 'feedback', label: t.feedback?.title || 'Feedback', icon: MessageSquare, path: '/gallery/feedback' }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-white font-inter-tight selection:bg-indigo-500/30">
            {/* Inject Font locally for this page if not global */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300&display=swap');
                .font-inter-tight { font-family: 'Inter Tight', sans-serif; }
                
                /* Modern Grid Layout - fixes empty space issue after deletion */
                .masonry-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                }
                @media (min-width: 640px) { .masonry-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (min-width: 1024px) { .masonry-grid { grid-template-columns: repeat(3, 1fr); } }
                @media (min-width: 1280px) { .masonry-grid { grid-template-columns: repeat(4, 1fr); } }

                .masonry-item {
                    /* Grid items automatically fill without gaps */
                }
            `}</style>

            {/* Ambient Background Glow */}
            <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none z-0" />

            <div className="max-w-[1800px] mx-auto relative z-10 px-4 md:px-8 py-6">

                {/* Modern Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 animate-fade-in-up relative z-20">

                    {/* Brand & View Switcher */}
                    <div className="flex items-center gap-8">
                        <div
                            className="text-2xl font-bold tracking-tight cursor-pointer flex items-center gap-2 group"
                            onClick={() => navigate('/gallery')}
                        >
                            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-black transform transition-transform group-hover:rotate-12">
                                <Sparkles size={16} fill="currentColor" />
                            </div>
                            <span>NexMap</span>
                        </div>

                        {/* Navigation Pills with Spotlight */}
                        <Spotlight spotColor="rgba(99, 102, 241, 0.1)" size={300} className="rounded-full">
                            <div className="hidden md:flex bg-slate-200/50 dark:bg-white/5 p-1.5 rounded-full border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow duration-300">
                                {navItems.map(tab => (
                                    <NavLink
                                        key={tab.id}
                                        to={tab.path}
                                        end={tab.end}
                                        aria-label={tab.label}
                                        className={({ isActive }) => `
                                            px-5 py-2 rounded-full text-sm font-semibold transition-all relative overflow-hidden flex items-center gap-2
                                            ${isActive
                                                ? 'text-white bg-black dark:bg-white dark:text-black shadow-lg'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}
                                        `}
                                    >
                                        {tab.icon && <tab.icon size={14} className={activeTab === tab.id ? (tab.id === 'favorites' ? 'fill-current' : '') : ''} />}
                                        {tab.label}
                                    </NavLink>
                                ))}
                            </div>
                        </Spotlight>
                    </div>

                    {/* User & Actions */}
                    <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                        {/* Mobile View Switcher (Simple Dropdown visual or scroll) */}
                        <div className="md:hidden flex-1 overflow-x-auto no-scrollbar flex gap-2">
                            {/* Mobile tabs would go here if needed, keeping it simple for now */}
                        </div>

                        {activeTab === 'active' && (
                            <button
                                onClick={() => onCreateBoard("New Board")}
                                className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5"
                            >
                                <Plus size={18} strokeWidth={3} />
                                <span>{t.gallery.newBoard || "New Board"}</span>
                            </button>
                        )}

                        {user ? (
                            <div className="relative z-50">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    aria-label="User Menu"
                                    className="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                                >
                                    {user.photoURL ? (
                                        <img src={user.photoURL} className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-black translate-x-[-4px]" alt="User" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-black translate-x-[-4px]">
                                            {user.displayName?.[0] || 'U'}
                                        </div>
                                    )}
                                    <span className="text-sm font-bold truncate max-w-[100px] hidden sm:block">{user.displayName}</span>
                                    {isPro && <ProBadge size="sm" />}
                                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                                </button>

                                {showUserMenu && (
                                    <>
                                        <div className="fixed inset-0 z-[100]" onClick={() => setShowUserMenu(false)} />
                                        <div className="absolute top-full right-0 mt-3 w-56 z-[101] bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden animate-scale-in origin-top-right p-2">
                                            <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t.gallery.account}</div>
                                            <button onClick={() => navigate('/pricing')} className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 flex items-center gap-2">
                                                <CreditCard size={16} /> {t.gallery.pricing}
                                            </button>
                                            <button onClick={() => setIsSettingsOpen(true)} className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 flex items-center gap-2">
                                                <Settings size={16} /> {t.settings?.title || 'Settings'}
                                            </button>
                                            <div className="h-px bg-slate-100 dark:bg-white/5 my-1" />
                                            <button onClick={() => onLogout('manual_user_click')} className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2">
                                                <LogOut size={16} /> {t.gallery.signOut}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <button onClick={onLogin} className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold shadow-lg hover:-translate-y-0.5 transition-all text-sm">
                                {t.gallery.signIn}
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Tab Bar (Visible only on mobile) */}
                <div className="md:hidden flex overflow-x-auto gap-2 mb-8 no-scrollbar pb-2">
                    {navItems.map(tab => (
                        <NavLink
                            key={tab.id}
                            to={tab.path}
                            end={tab.end}
                            className={({ isActive }) => `
                                px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border
                                ${isActive
                                    ? 'bg-black dark:bg-white text-white dark:text-black border-transparent'
                                    : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'}
                            `}
                        >
                            {tab.label}
                        </NavLink>
                    ))}
                </div>

                {/* Main Content Area */}
                <main className="animate-fade-in-up duration-500 delay-100 min-h-[60vh] pb-32">
                    <Routes>
                        <Route index element={
                            <BoardGallery
                                boards={activeBoards}
                                onCreateBoard={onCreateBoard}
                                onSelectBoard={onSelectBoard}
                                onDeleteBoard={onDeleteBoard}
                                onRestoreBoard={onRestoreBoard}
                                onPermanentlyDeleteBoard={onPermanentlyDeleteBoard}
                                onUpdateBoardMetadata={onUpdateBoardMetadata}
                                isTrashView={false}
                                onImportGuide={handleCreateGuide}
                            />
                        } />
                        <Route path="favorites" element={<FavoritesGallery />} />
                        <Route path="statistics" element={<StatisticsView boardsList={boardsList} user={user} />} />
                        <Route path="trash" element={
                            <BoardGallery
                                boards={trashBoards}
                                onCreateBoard={onCreateBoard}
                                onSelectBoard={() => { }} // Cannot select trash items
                                onDeleteBoard={onDeleteBoard}
                                onRestoreBoard={onRestoreBoard}
                                onPermanentlyDeleteBoard={onPermanentlyDeleteBoard}
                                onUpdateBoardMetadata={onUpdateBoardMetadata}
                                isTrashView={true}
                                onImportGuide={handleCreateGuide}
                            />
                        } />
                        <Route path="feedback" element={<FeedbackView user={user} onLogin={onLogin} />} />
                    </Routes>
                </main>
            </div>

            {/* Quick Settings Action (Floating) */}
            <div className="fixed bottom-8 right-8 z-40 hidden md:block">
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    aria-label="Open Settings"
                    className="w-12 h-12 rounded-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 shadow-xl flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:scale-110 transition-all"
                >
                    <Settings size={20} />
                </button>
            </div>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                user={user}

            />

            <UsageStatsModal
                isOpen={isStatsOpen}
                onClose={() => setIsStatsOpen(false)}
                boardsList={boardsList}
                user={user}
            />

            {/* Payment Success Modal */}
            <PaymentSuccessModal
                isOpen={paymentSuccessOpen}
                onClose={() => {
                    setPaymentSuccessOpen(false);
                    setOrderDetails(null);
                }}
                orderDetails={orderDetails}
            />
        </div>
    );
}
