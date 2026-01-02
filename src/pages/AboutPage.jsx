import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Brain, Zap, Infinity as InfinityIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function AboutPage() {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
                {/* Header */}
                <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-20 group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium tracking-wide">BACK TO HOME</span>
                </Link>

                {/* Main Content */}
                <article className="prose prose-invert prose-lg md:prose-xl max-w-none">
                    <div className="mb-24">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-mono mb-8">
                            <Sparkles size={12} />
                            <span>OUR MANIFESTO</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent mb-8">
                            Beyond the Chatbox.
                        </h1>
                        <p className="text-2xl md:text-3xl text-white/60 font-light leading-relaxed">
                            We believe that the current interface of Large Language Models—the chatbox—is a bottleneck for human creativity.
                        </p>
                    </div>

                    <div className="space-y-40">
                        {/* Section 1 */}
                        <section className="relative group">
                            <div className="absolute -left-12 top-0 text-8xl font-black text-white/[0.02] -z-10 select-none group-hover:text-white/[0.04] transition-colors">01</div>
                            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-4">
                                <Brain className="text-indigo-400" size={28} />
                                The Cognitive Cage
                            </h2>
                            <p className="text-white/70 leading-loose">
                                Look at how we interact with the most powerful intelligence humanity has ever created. It's confined to a linear, text-based terminal. It feels like talking to a genius through a telegram wire. We are forcing multi-dimensional thoughts into a single dimension of text stream. This is not how our brains work. We think in connections, in spaces, in chaotic webs of related ideas.
                            </p>
                        </section>

                        {/* Section 2 */}
                        <section className="relative group">
                            <div className="absolute -left-12 top-0 text-8xl font-black text-white/[0.02] -z-10 select-none group-hover:text-white/[0.04] transition-colors">02</div>
                            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-4">
                                <Zap className="text-amber-400" size={28} />
                                Breaking the Linear Wall
                            </h2>
                            <p className="text-white/70 leading-loose">
                                MixBoard isn't just a canvas; it's a rebellion against the linearity of modern AI interfaces. We are building a space where your thoughts can explode, branch out, and reconnect. Where an AI response isn't the end of a conversation, but the seed of a new forest. We want to unleash the true potential of LLMs by giving them a spatial dimension to live in.
                            </p>
                        </section>

                        {/* Section 3 */}
                        <section className="relative group">
                            <div className="absolute -left-12 top-0 text-8xl font-black text-white/[0.02] -z-10 select-none group-hover:text-white/[0.04] transition-colors">03</div>
                            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-4">
                                <InfinityIcon className="text-emerald-400" size={28} />
                                The Future is Infinite
                            </h2>
                            <p className="text-white/70 leading-loose">
                                We are just getting started. The future of AI interaction won't be scrolling through a history of 500 messages to find that one code snippet. It will be a living, breathing map of your intellect, augmented by an AI that understands context, structure, and intent. We are building the tools for the next generation of thinkers, creators, and dreamers.
                            </p>
                            <p className="text-white/70 leading-loose mt-8">
                                Welcome to the infinite canvas.
                            </p>
                        </section>
                    </div>

                    <div className="mt-40 pt-20 border-t border-white/5 text-center">
                        <p className="text-white/30 text-sm font-mono">
                            BUILT FOR THE REBELS.
                        </p>
                    </div>
                </article>
            </div>
        </div>
    );
}
