import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap, Layout, Infinity as InfinityIcon, Brain } from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleStart = () => {
        navigate('/gallery');
    };

    return (
        <div className="min-h-screen bg-mesh-gradient selection:bg-rose-200 selection:text-rose-900 font-lxgw overflow-x-hidden">
            {/* Sticky Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-4 glass-panel border-b border-white/20' : 'py-6 bg-transparent'}`}>
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center shadow-lg transform rotate-3">
                            <span className="text-white font-bold text-lg">M</span>
                        </div>
                        <span className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">MixBoard</span>
                    </div>
                    <div>
                        <button
                            onClick={handleStart}
                            className="px-6 py-2.5 rounded-full bg-slate-900 text-white font-medium hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/20 text-sm flex items-center gap-2"
                        >
                            Open App <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-40 pb-20 lg:pt-52 lg:pb-32 px-6">
                <div className="container mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel mb-8 animate-fade-in border border-rose-200/50">
                        <Sparkles size={14} className="text-rose-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-rose-600/80">Next Gen Canvas</span>
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 dark:text-slate-100 mb-8 tracking-tight leading-tight animate-slide-up">
                        Organize your <br />
                        <span className="text-gradient">creative chaos.</span>
                    </h1>

                    <p className="text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        An infinite canvas for your thoughts, notes, and ideas.
                        Powered by AI to help you connect the dots and spark new inspiration.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <button
                            onClick={handleStart}
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold text-lg hover:shadow-xl hover:shadow-orange-500/20 transition-all hover:-translate-y-1 active:translate-y-0 active:scale-95 flex items-center justify-center gap-2"
                        >
                            Start Creating for Free
                            <ArrowRight size={20} />
                        </button>
                        <button className="w-full sm:w-auto px-8 py-4 rounded-full glass-panel hover:bg-white/80 text-slate-700 font-semibold transition-all hover:shadow-premium border border-white/50 backdrop-blur-md">
                            Read the Manifesto
                        </button>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-10 lg:left-20 w-64 h-64 bg-rose-300/20 rounded-full blur-[100px] -z-10 animate-float" />
                <div className="absolute top-1/3 right-10 lg:right-20 w-72 h-72 bg-blue-300/20 rounded-full blur-[100px] -z-10 animate-float" style={{ animationDelay: '2s' }} />
            </header>

            {/* Feature Showcase */}
            <section className="py-20 px-6">
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="glass-card p-8 rounded-3xl hover:glass-card-hover transition-all duration-300 group">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <InfinityIcon className="text-indigo-600" size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">Infinite Workspace</h3>
                            <p className="text-slate-600 leading-relaxed">
                                No boundaries, no pages. Just one endless surface to map out your entire project, research, or second brain.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="glass-card p-8 rounded-3xl hover:glass-card-hover transition-all duration-300 group">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Brain className="text-rose-600" size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">AI Co-pilot</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Built-in Gemini integration to help you write, brainstorm, and generate visual mood boards instantly.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="glass-card p-8 rounded-3xl hover:glass-card-hover transition-all duration-300 group">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Layout className="text-emerald-600" size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">Multimedia Cards</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Drag and drop images, write in Markdown, paste links, or create sticky notes. Everything works together.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Visual Demo Section - A mock interface or just a nice visual */}
            <section className="py-20 px-6 relative overflow-hidden">
                <div className="container mx-auto relative z-10">
                    <div className="glass-panel p-2 rounded-3xl shadow-2xl overflow-hidden border border-white/40">
                        {/* Mock Browser Header */}
                        <div className="bg-slate-50/50 h-12 flex items-center gap-2 px-4 border-b border-slate-200/50">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                            </div>
                            <div className="flex-1 text-center text-xs text-slate-400 font-medium">Untitled Board</div>
                        </div>
                        {/* Mock Content */}
                        <div className="bg-white/40 h-[400px] lg:h-[600px] w-full relative overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 bg-mesh-gradient opacity-30"></div>

                            {/* Floating Cards Animation */}
                            <div className="absolute top-1/4 left-1/4 p-4 glass-card rounded-xl w-64 animate-float shadow-lg">
                                <div className="h-4 w-3/4 bg-slate-200 rounded mb-3"></div>
                                <div className="h-2 w-full bg-slate-100 rounded mb-1"></div>
                                <div className="h-2 w-5/6 bg-slate-100 rounded mb-1"></div>
                            </div>

                            <div className="absolute bottom-1/3 right-1/4 p-4 bg-[#fff9c4] rounded-xl w-56 -rotate-3 animate-float shadow-lg" style={{ animationDelay: '1.5s', boxShadow: '2px 4px 12px rgba(0,0,0,0.05)' }}>
                                <div className="font-handwriting text-slate-700">
                                    Don't forget to review the new design specs! 🎨
                                </div>
                            </div>

                            <div className="text-center relative z-10">
                                <div className="inline-block p-4 rounded-full bg-white/50 backdrop-blur-sm shadow-sm mb-4">
                                    <Zap size={32} className="text-amber-500 fill-amber-500" />
                                </div>
                                <h4 className="text-2xl font-bold text-slate-800">Ready to dive in?</h4>
                                <button
                                    onClick={handleStart}
                                    className="mt-6 px-8 py-3 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg"
                                >
                                    Open Canvas
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-slate-200/50 bg-white/30 backdrop-blur-sm">
                <div className="container mx-auto px-6 text-center text-slate-500">
                    <p className="mb-4 text-sm">© {new Date().getFullYear()} MixBoard Canvas. All rights reserved.</p>
                    <div className="flex justify-center gap-6 text-sm font-medium">
                        <a href="#" className="hover:text-rose-500 transition-colors">Twitter</a>
                        <a href="#" className="hover:text-rose-500 transition-colors">GitHub</a>
                        <a href="#" className="hover:text-rose-500 transition-colors">Discord</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
