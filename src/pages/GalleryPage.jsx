import React, { useState } from 'react';
import { Plus, Settings } from 'lucide-react';
import BoardGallery from '../components/BoardGallery';
import SettingsModal from '../components/SettingsModal';

export default function GalleryPage({
    boardsList,
    onCreateBoard,
    onSelectBoard,
    onDeleteBoard,
    user,
    onLogin,
    onLogout
}) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="bg-[#FBFBFC] dark:bg-slate-950 h-screen text-slate-900 dark:text-slate-200 p-8 font-lxgw relative overflow-y-auto">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="sticky top-0 z-50 flex justify-between items-center mb-16 py-6 bg-[#FBFBFC]/70 dark:bg-slate-950/70 backdrop-blur-xl">
                    <h1 className="text-3xl font-black tracking-tight"><span className="text-blue-600">Neural</span> Canvas</h1>
                    <div className="flex items-center gap-4">
                        <button onClick={() => onCreateBoard("New Board")} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-premium hover:scale-110 transition-all"><Plus size={20} /></button>
                        {user ? (
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl pl-2 pr-5 py-2 border border-slate-200 shadow-premium">
                                {user.photoURL && <img src={user.photoURL} className="w-8 h-8 rounded-xl shadow-sm" alt="User" />}
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold leading-none">{user.displayName}</span>
                                    <button onClick={onLogout} className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase mt-1 text-left">Sign Out</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={onLogin} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:scale-105 transition-all">Sign In</button>
                        )}
                    </div>
                </div>
                <BoardGallery boards={boardsList} onCreateBoard={onCreateBoard} onSelectBoard={onSelectBoard} onDeleteBoard={onDeleteBoard} />
            </div>
            <div className="fixed bottom-10 right-10">
                <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-white shadow-2xl rounded-2xl text-slate-400 hover:text-blue-600 hover:scale-110 transition-all border border-slate-100"><Settings size={24} /></button>
            </div>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} />
        </div>
    );
}
