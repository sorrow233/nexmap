import React from 'react';
import { X, Sparkles, Zap, Network, Wand2, Users, Cloud, ArrowRight } from 'lucide-react';

export default function WelcomeCanvas({ onDismiss }) {
    return (
        <div className="fixed inset-0 z-[100] bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md overflow-y-auto custom-scrollbar">
            {/* Background Gradients - Softer & More Ambient */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-100/40 via-purple-100/20 to-transparent dark:from-blue-900/20 dark:via-purple-900/10 dark:to-transparent" />
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }} />
            </div>

            {/* Pattern Grid */}
            <div className="fixed inset-0 opacity-[0.02] pointer-events-none" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                backgroundSize: '32px 32px'
            }} />

            {/* Close Button - Fixed Position */}
            <button
                onClick={onDismiss}
                className="fixed top-6 right-6 z-[110] p-3 rounded-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 group"
                aria-label="Close"
            >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Main Content - Scrollable Flow */}
            <div className="relative min-h-full flex flex-col items-center pt-16 md:pt-24 pb-16 md:pb-20 px-4 md:px-12">

                {/* Hero Section */}
                <div className="text-center mb-16 max-w-3xl animate-slide-down">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50/80 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 mb-6">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-bold tracking-wide text-blue-600 dark:text-blue-400 uppercase">New Way to Think</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 dark:text-white mb-4 md:mb-6 tracking-tight leading-[1.15] md:leading-[1.1]">
                        无限画布 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">×</span> AI 思维协作
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto px-2">
                        打破传统线性对话，在广阔的二维空间中自由挥洒灵感。
                        <br className="hidden md:block" />
                        随时召唤 Gemini 3.0 Pro & Flash，让每个节点都充满智慧。
                    </p>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-6xl w-full mb-12 md:mb-16">

                    <FeatureCard
                        icon={<Sparkles className="w-5 h-5" />}
                        color="blue"
                        title="AI 智能对话"
                        description="集成 Gemini 3.0 Pro & Flash，联网搜索、视觉识别、极速响应，一切尽在掌握。"
                        delay="0s"
                    >
                        <MockChat />
                    </FeatureCard>

                    <FeatureCard
                        icon={<Network className="w-5 h-5" />}
                        color="purple"
                        title="无限画布"
                        description="双指随意缩放、无限拖拽平移。你的思维有多大，这片画布就有多大。"
                        delay="0.1s"
                    >
                        <MockCanvas />
                    </FeatureCard>

                    <FeatureCard
                        icon={<Zap className="w-5 h-5" />}
                        color="amber"
                        title="智能连线"
                        description="点击连接，AI 瞬间理解上下文。免去繁琐说明，让逻辑自然流淌。"
                        delay="0.2s"
                    >
                        <MockConnection />
                    </FeatureCard>

                    <FeatureCard
                        icon={<Wand2 className="w-5 h-5" />}
                        color="emerald"
                        title="一键自动布局"
                        description="乱了？一键整理。思维导图算法，瞬间还原清晰树状结构。"
                        delay="0.3s"
                    >
                        <MockLayout />
                    </FeatureCard>

                    <FeatureCard
                        icon={<Users className="w-5 h-5" />}
                        color="rose"
                        title="批量操作"
                        description="框选多张卡片，批量重写、删除或建立连接。效率提升不止十倍。"
                        delay="0.4s"
                    >
                        <MockBatch />
                    </FeatureCard>

                    <FeatureCard
                        icon={<Cloud className="w-5 h-5" />}
                        color="indigo"
                        title="云端同步"
                        description="基于 Firebase 实时同步。手机上的灵感，电脑上瞬间可见。"
                        delay="0.5s"
                    >
                        <MockCloud />
                    </FeatureCard>

                </div>

                {/* CTA Button */}
                <div className="relative group animate-slide-up ">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                    <button
                        onClick={onDismiss}
                        className="relative px-8 py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3"
                    >
                        <span>开始创作</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                <p className="mt-8 text-sm font-medium text-slate-400 dark:text-slate-500 animate-fade-in text-center">
                    💡 仅首次访问显示 · 点击按钮进入画布
                </p>
            </div>
        </div>
    );
}

// --- Sub Components for cleaner code ---

function FeatureCard({ icon, color, title, description, children, delay }) {
    const colorStyles = {
        blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
        purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
        amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
        emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
        rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20",
        indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20",
    };

    return (
        <div
            className="group relative p-6 rounded-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-white/5 hover:border-white dark:hover:border-white/10 shadow-sm hover:shadow-xl hover:bg-white/80 dark:hover:bg-slate-900/60 transition-all duration-300 animate-slide-up flex flex-col h-full"
            style={{ animationDelay: delay }}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${colorStyles[color]} transition-colors`}>
                {icon}
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                {title}
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 flex-grow">
                {description}
            </p>

            <div className="relative rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-white/5 group-hover:border-slate-200 dark:group-hover:border-white/10 transition-colors h-32 flex items-center justify-center">
                {children}
            </div>
        </div>
    );
}

// --- Visual Mocks (Simplified & Aesthetic) ---

function MockChat() {
    return (
        <div className="w-full px-4 flex flex-col gap-2 scale-90 opacity-80 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500">
            <div className="self-end bg-blue-500 text-white text-[10px] px-2 py-1.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[80%]">
                无限暖暖2.0什么时候上线？
            </div>
            <div className="self-start bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] px-3 py-2 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2 max-w-[90%]">
                <Sparkles className="w-3 h-3 text-purple-500 flex-shrink-0" />
                <span className="truncate">根据最新资讯，2.0版本将于...</span>
            </div>
        </div>
    );
}

function MockCanvas() {
    return (
        <div className="grid grid-cols-3 gap-2 p-4 scale-90 group-hover:rotate-3 transition-transform duration-500">
            {[...Array(9)].map((_, i) => (
                <div
                    key={i}
                    className="w-6 h-6 rounded bg-purple-100/50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800"
                    style={{ opacity: 1 - i * 0.05 }}
                />
            ))}
        </div>
    );
}

function MockConnection() {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute left-8 w-2 h-2 rounded-full bg-amber-400 ring-4 ring-amber-100 dark:ring-amber-900/20" />
            <div className="absolute right-8 w-2 h-2 rounded-full bg-orange-400 ring-4 ring-orange-100 dark:ring-orange-900/20" />
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <path
                    d="M 60 64 Q 100 32, 140 64"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-amber-300 dark:text-amber-700 stroke-dasharray-100 animate-draw"
                />
            </svg>
        </div>
    );
}

function MockLayout() {
    return (
        <div className="flex items-center gap-2 scale-90 group-hover:scale-100 transition-transform duration-500">
            <div className="w-8 h-12 rounded border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20" />
            <div className="w-4 h-0.5 bg-emerald-200 dark:bg-emerald-800" />
            <div className="flex flex-col gap-1">
                <div className="w-8 h-5 rounded border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20" />
                <div className="w-8 h-5 rounded border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20" />
            </div>
        </div>
    );
}

function MockBatch() {
    return (
        <div className="flex flex-wrap justify-center gap-2 px-6">
            {['Regen', 'Delete', 'Link'].map((t, i) => (
                <span key={i} className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400 transform hover:-translate-y-1 transition-transform duration-300 delay-75">
                    {t}
                </span>
            ))}
        </div>
    );
}

function MockCloud() {
    return (
        <div className="flex items-center gap-4 text-2xl">
            <span className="animate-bounce" style={{ animationDelay: '0s' }}>💻</span>
            <span className="text-slate-300 dark:text-slate-600">→</span>
            <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>📱</span>
        </div>
    );
}

// Add these custom animations to index.css if not already present
// .animate-draw { stroke-dasharray: 100; animation: draw 2s infinite; }
// @keyframes draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
