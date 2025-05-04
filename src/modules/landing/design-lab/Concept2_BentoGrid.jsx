import React from 'react';

const Concept2_BentoGrid = () => {
    return (
        <div className="w-full h-full bg-[#0a0a0a] p-8 md:p-20 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                <header className="mb-20 flex justify-between items-end">
                    <div>
                        <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Structura</h1>
                        <p className="text-zinc-500">Organized chaos.</p>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="text-xs text-zinc-600 uppercase tracking-widest">Version 2.0</div>
                        <div className="text-xs text-zinc-600 uppercase tracking-widest">System Ready</div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-6 h-[1200px] md:h-[800px]">
                    {/* Hero Block */}
                    <div className="md:col-span-2 md:row-span-2 bg-zinc-900 rounded-3xl p-8 border border-white/5 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <h2 className="text-3xl text-white font-medium relative z-10">AI-First Canvas</h2>
                        <p className="mt-4 text-zinc-400 relative z-10 max-w-sm">
                            Forget files. Think in maps. Your entire knowledge base, visualized in one infinite plane.
                        </p>
                        <div className="absolute bottom-8 right-8 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all duration-500"></div>
                    </div>

                    {/* Feature 1 */}
                    <div className="bg-zinc-900 rounded-3xl p-6 border border-white/5 flex flex-col justify-between hover:border-white/20 transition-colors">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <div>
                            <h3 className="text-white font-medium mb-1">Instant Speed</h3>
                            <p className="text-xs text-zinc-500">Local-first architecture.</p>
                        </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-zinc-900 rounded-3xl p-6 border border-white/5 flex flex-col justify-between hover:border-white/20 transition-colors">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        </div>
                        <div>
                            <h3 className="text-white font-medium mb-1">Collaborative</h3>
                            <p className="text-xs text-zinc-500">Real-time sync.</p>
                        </div>
                    </div>

                    {/* Tall Block */}
                    <div className="md:row-span-2 bg-[#111] rounded-3xl p-8 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10"></div>
                        <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" alt="Abstract" />
                        <div className="absolute bottom-8 left-8 z-20">
                            <h3 className="text-2xl text-white font-bold">Infinite Scale</h3>
                            <p className="text-zinc-400 text-sm mt-2">Grow without limits.</p>
                        </div>
                    </div>

                    {/* Wide Block */}
                    <div className="md:col-span-2 bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-3xl p-8 border border-white/5 flex items-center justify-between group">
                        <div>
                            <h3 className="text-2xl text-white font-bold mb-2">Join the Beta</h3>
                            <p className="text-zinc-400 text-sm">Experience the future today.</p>
                        </div>
                        <button className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-zinc-200 transition-colors">
                            Get Access
                        </button>
                    </div>

                    {/* Filler */}
                    <div className="bg-zinc-900 rounded-3xl p-6 border border-white/5 flex items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer">
                        <span className="text-zinc-500 font-mono text-xs rotating-text group-hover:text-white transition-colors">Make it yours -></span>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Concept2_BentoGrid;
