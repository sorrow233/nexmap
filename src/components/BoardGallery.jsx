import React, { useState } from 'react';
import { LayoutGrid, Plus, Trash2, Clock, FileText, ChevronRight, Sparkles, X, ArrowRight } from 'lucide-react';

export default function BoardGallery({ boards, onSelectBoard, onCreateBoard, onDeleteBoard }) {
    const [isCreating, setIsCreating] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState('');
    const [quickPrompt, setQuickPrompt] = useState('');

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        if (newBoardTitle.trim()) {
            onCreateBoard(newBoardTitle, null);
            setIsCreating(false);
            setNewBoardTitle('');
        }
    };

    const handleQuickStart = (e) => {
        if (e.key === 'Enter' && quickPrompt.trim()) {
            const title = quickPrompt.length > 30 ? quickPrompt.substring(0, 30) + '...' : quickPrompt;
            onCreateBoard(title, quickPrompt);
            setQuickPrompt('');
        }
    };

    return (
        <div className="min-h-full animate-fade-in custom-scrollbar pb-20">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
                <div>
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-purple-200 tracking-tight mb-2 filter drop-shadow-lg">
                        My Workspace
                    </h1>
                    <p className="text-slate-400 text-lg font-medium">Continue your creative journey</p>
                </div>

                {isCreating ? (
                    <form onSubmit={handleCreateSubmit} className="flex items-center gap-2 animate-slide-up">
                        <input
                            autoFocus
                            type="text"
                            value={newBoardTitle}
                            onChange={e => setNewBoardTitle(e.target.value)}
                            placeholder="Board name..."
                            className="bg-slate-800/50 text-white px-6 py-3 rounded-full border border-white/10 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 outline-none w-64 backdrop-blur-md"
                        />
                        <button
                            type="submit"
                            className="bg-brand-500 hover:bg-brand-400 text-white p-3 rounded-full transition-all shadow-lg shadow-brand-500/20"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="bg-slate-800/50 hover:bg-slate-700 text-slate-400 p-3 rounded-full transition-all backdrop-blur-md border border-white/5"
                        >
                            <X size={20} />
                        </button>
                    </form>
                ) : (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-full font-bold backdrop-blur-md border border-white/10 hover:border-brand-500/50 transition-all duration-300"
                    >
                        <div className="bg-brand-500 group-hover:bg-brand-400 text-white p-1 rounded-full transition-colors">
                            <Plus size={16} />
                        </div>
                        <span className="group-hover:text-brand-200 transition-colors">New Board</span>
                    </button>
                )}
            </header>

            {/* Quick Start / Hero Input */}
            <div className="mb-20 relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 via-purple-500/20 to-brand-500/20 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="relative bg-slate-900/60 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] flex items-center gap-4 transition-all focus-within:ring-2 focus-within:ring-brand-500/50 shadow-2xl">
                    <div className="pl-6 text-brand-400 animate-pulse-slow">
                        <Sparkles size={24} />
                    </div>
                    <input
                        type="text"
                        value={quickPrompt}
                        onChange={e => setQuickPrompt(e.target.value)}
                        onKeyDown={handleQuickStart}
                        placeholder="What's on your mind? Type to start..."
                        className="w-full bg-transparent border-none outline-none py-4 text-xl text-white placeholder:text-slate-500 font-medium"
                    />
                    <button
                        onClick={() => handleQuickStart({ key: 'Enter' })}
                        className="bg-gradient-to-r from-brand-600 to-brand-500 text-white px-8 py-3 rounded-[1.5rem] font-bold hover:shadow-lg hover:shadow-brand-500/25 transition-all mr-2 active:scale-95"
                    >
                        Start
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {boards.map((board, index) => (
                    <div
                        key={board.id}
                        onClick={() => onSelectBoard(board.id)}
                        style={{ animationDelay: `${index * 75}ms` }}
                        className="group relative bg-slate-800/40 backdrop-blur-md rounded-[2rem] p-8 border border-white/5 hover:border-brand-400 hover:ring-2 hover:ring-brand-500/50 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-500/40 flex flex-col h-[260px] animate-slide-up"
                    >
                        {/* Inner Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-brand-400 group-hover:border-brand-500/30 transition-colors">
                                    <FileText size={24} />
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteBoard(board.id);
                                    }}
                                    className="p-3 text-slate-600 hover:text-red-400 hover:bg-white/5 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                                    title="Delete Board"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>

                            <h3 className="text-2xl font-bold text-slate-200 mb-2 truncate group-hover:text-white transition-colors">
                                {board.name}
                            </h3>

                            <p className="text-slate-500 text-sm line-clamp-2 mb-6 font-medium">
                                Last edited {new Date(board.updatedAt || Date.now()).toLocaleDateString()}
                            </p>

                            <div className="mt-auto flex items-center justify-between">
                                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg text-slate-400 text-xs font-bold uppercase tracking-wider border border-white/5">
                                    <Clock size={12} />
                                    <span>{new Date(board.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-brand-500 group-hover:text-white transition-all transform scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {boards.length === 0 && (
                    <div className="col-span-full py-32 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 animate-fade-in backdrop-blur-sm">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <LayoutGrid size={40} className="text-slate-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-300 mb-2">No boards yet</h2>
                        <p className="opacity-60 mb-8">Start your first creative session above</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Local Loader Compatibility
if (typeof window !== 'undefined') {
    window.BoardGallery = BoardGallery;
}
