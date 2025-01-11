
import React, { useState } from 'react';
import { LayoutGrid, Plus, Trash2, Clock, FileText, ChevronRight, Sparkles, X } from 'lucide-react';

export default function BoardGallery({ boards, onSelectBoard, onCreateBoard, onDeleteBoard }) {
    const [isCreating, setIsCreating] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState('');
    const [quickPrompt, setQuickPrompt] = useState('');

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        if (newBoardTitle.trim()) {
            onCreateBoard(newBoardTitle, null); // null = no initial prompt
            setIsCreating(false);
            setNewBoardTitle('');
        }
    };

    const handleQuickStart = (e) => {
        if (e.key === 'Enter' && quickPrompt.trim()) {
            // Create a board titled with the prompt (truncated) and pass the prompt as initial message
            const title = quickPrompt.length > 30 ? quickPrompt.substring(0, 30) + '...' : quickPrompt;
            onCreateBoard(title, quickPrompt);
            setQuickPrompt('');
        }
    };
    return (
        <div className="min-h-screen bg-[#f8fafc] p-8 sm:p-16 animate-fade-in overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                                <LayoutGrid size={24} />
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                                My Workspace
                            </h1>
                        </div>
                        <p className="text-slate-500 font-medium ml-1">Select a board to continue your creative journey</p>
                    </div>

                    {isCreating ? (
                        <form onSubmit={handleCreateSubmit} className="flex items-center gap-2 animate-fade-in">
                            <input
                                autoFocus
                                type="text"
                                value={newBoardTitle}
                                onChange={e => setNewBoardTitle(e.target.value)}
                                placeholder="Enter board name..."
                                className="px-6 py-4 rounded-[2rem] border border-brand-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none w-64 shadow-xl"
                            />
                            <button
                                type="submit"
                                className="bg-brand-600 text-white p-4 rounded-full hover:bg-brand-700 transition-colors shadow-lg"
                            >
                                <ChevronRight size={20} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="bg-slate-100 text-slate-500 p-4 rounded-full hover:bg-slate-200 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="group flex items-center gap-3 bg-white hover:bg-brand-600 text-slate-900 hover:text-white px-8 py-4 rounded-[2rem] font-bold shadow-xl shadow-slate-200/50 hover:shadow-brand-500/30 transition-all duration-300 border border-slate-100 hover:border-brand-500"
                        >
                            <div className="bg-brand-500 group-hover:bg-white text-white group-hover:text-brand-600 p-1 rounded-full transition-colors">
                                <Plus size={18} />
                            </div>
                            New Board
                        </button>
                    )}
                </header>

                {/* Quick Start Hero Section */}
                <div className="mb-16 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-purple-500/10 rounded-[3rem] blur-3xl transform -rotate-1"></div>
                    <div className="relative bg-white/60 backdrop-blur-xl border border-white/50 p-1 rounded-[3rem] shadow-2xl flex items-center gap-4 transition-all focus-within:ring-4 focus-within:ring-brand-500/20 focus-within:scale-[1.01]">
                        <div className="pl-6 text-brand-500">
                            <Sparkles size={28} />
                        </div>
                        <input
                            type="text"
                            value={quickPrompt}
                            onChange={e => setQuickPrompt(e.target.value)}
                            onKeyDown={handleQuickStart}
                            placeholder="What's on your mind? Type a thought to start a new board..."
                            className="w-full bg-transparent border-none outline-none py-6 text-xl text-slate-700 placeholder:text-slate-400 font-medium"
                        />
                        <button
                            onClick={() => handleQuickStart({ key: 'Enter' })}
                            className="bg-brand-600 text-white px-8 py-4 rounded-[2.5rem] font-bold hover:bg-brand-700 transition-all mr-2"
                        >
                            Start
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {boards.map((board, index) => (
                        <div
                            key={board.id}
                            onClick={() => onSelectBoard(board.id)}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className="group relative bg-white rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl border border-slate-100 hover:border-brand-200 cursor-pointer transition-all duration-500 flex flex-col h-[280px] animate-slide-up"
                        >
                            {/* Decorative element */}
                            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-brand-50 to-transparent rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700" />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                                        <FileText size={24} />
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteBoard(board.id);
                                        }}
                                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                                        title="Delete Board"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>

                                <h3 className="text-2xl font-bold text-slate-800 mb-3 truncate group-hover:text-brand-600 transition-colors leading-tight">
                                    {board.name}
                                </h3>

                                <p className="text-slate-400 text-sm line-clamp-2 mb-6 font-medium">
                                    Last session {new Date(board.updatedAt).toLocaleDateString()}
                                </p>

                                <div className="mt-auto flex items-center justify-between">
                                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl text-slate-600 text-xs font-bold uppercase tracking-wider">
                                        <span>{board.cardCount || 0} Nodes</span>
                                    </div>
                                    <div className="text-brand-500 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                        <ChevronRight size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {boards.length === 0 && (
                        <div className="col-span-full py-32 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 animate-fade-in">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 opacity-50">
                                <FileText size={40} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Your workspace is empty</h2>
                            <p className="text-slate-500 mb-8 font-medium">Create your first board to start organizing thoughts</p>
                            <button
                                onClick={onCreateBoard}
                                className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all"
                            >
                                Get Started
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

if (typeof window !== 'undefined') {
    window.BoardGallery = BoardGallery;
}
