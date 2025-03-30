import React from 'react';
import { X, Sparkles, Zap, Network, Wand2, Users, Cloud } from 'lucide-react';

export default function WelcomeCanvas({ onDismiss }) {
    return (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/20 overflow-hidden">
            {/* Animated Background Grid */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `
                    linear-gradient(to right, currentColor 1px, transparent 1px),
                    linear-gradient(to bottom, currentColor 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
            }} />

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${5 + Math.random() * 5}s`
                        }}
                    />
                ))}
            </div>

            {/* Close Button */}
            <button
                onClick={onDismiss}
                className="fixed top-6 right-6 z-[110] p-3 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group"
                aria-label="开始创作"
            >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Main Content Container */}
            <div className="relative h-full flex flex-col items-center justify-center p-8 overflow-y-auto">

                {/* Hero Section */}
                <div className="text-center mb-12 animate-slide-down">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 dark:border-blue-700/50 mb-6">
                        <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                        <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            欢迎来到 Neural Canvas
                        </span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-slate-800 via-blue-700 to-purple-700 dark:from-slate-100 dark:via-blue-300 dark:to-purple-300 bg-clip-text text-transparent">
                        无限画布 × AI 思维协作
                    </h1>

                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        打破线性对话限制，在二维空间中自由组织想法，随时召唤 Gemini 2.0 为每个节点注入智慧
                    </p>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full mb-8">

                    {/* Feature 1: AI Chat */}
                    <FeatureCard
                        icon={<Sparkles className="w-6 h-6" />}
                        title="AI 智能对话"
                        description="集成 Gemini 2.0 Flash，支持联网搜索、图片上传、实时流式输出"
                        gradient="from-blue-500 to-cyan-500"
                        delay="0s"
                    >
                        <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-xs font-mono">
                            <div className="flex items-start gap-2 mb-2">
                                <span className="text-blue-600 dark:text-blue-400">❯</span>
                                <span className="text-slate-700 dark:text-slate-300">无限暖暖2.0什么时候上线？</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-purple-600 dark:text-purple-400">✨</span>
                                <span className="text-slate-600 dark:text-slate-400">根据最新资讯，《无限暖暖》2.0版本...</span>
                            </div>
                        </div>
                    </FeatureCard>

                    {/* Feature 2: Infinite Canvas */}
                    <FeatureCard
                        icon={<Network className="w-6 h-6" />}
                        title="无限画布"
                        description="双指缩放、无限拖拽，构建你的思维宫殿"
                        gradient="from-purple-500 to-pink-500"
                        delay="0.1s"
                    >
                        <div className="mt-3 grid grid-cols-3 gap-1.5">
                            {[...Array(9)].map((_, i) => (
                                <div
                                    key={i}
                                    className="aspect-square rounded bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-700/50"
                                    style={{
                                        animation: `float ${2 + i * 0.2}s ease-in-out infinite`,
                                        animationDelay: `${i * 0.1}s`
                                    }}
                                />
                            ))}
                        </div>
                    </FeatureCard>

                    {/* Feature 3: Smart Connections */}
                    <FeatureCard
                        icon={<Zap className="w-6 h-6" />}
                        title="智能连线"
                        description="点击卡片图标建立连接，AI 会自动理解上下文关系"
                        gradient="from-amber-500 to-orange-500"
                        delay="0.2s"
                    >
                        <div className="mt-3 relative h-20">
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 80">
                                <defs>
                                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#f97316" stopOpacity="0.6" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d="M 30 40 Q 100 10, 170 40"
                                    stroke="url(#lineGrad)"
                                    strokeWidth="2"
                                    fill="none"
                                    className="animate-draw"
                                />
                                <circle cx="30" cy="40" r="4" fill="#f59e0b" className="animate-pulse" />
                                <circle cx="170" cy="40" r="4" fill="#f97316" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
                            </svg>
                        </div>
                    </FeatureCard>

                    {/* Feature 4: Auto Layout */}
                    <FeatureCard
                        icon={<Wand2 className="w-6 h-6" />}
                        title="一键自动布局"
                        description="MindNode 风格的树状布局，告别凌乱"
                        gradient="from-emerald-500 to-teal-500"
                        delay="0.3s"
                    >
                        <div className="mt-3 flex items-center justify-center gap-2">
                            <div className="w-12 h-8 rounded bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700" />
                            <div className="flex flex-col gap-1.5">
                                <div className="w-10 h-6 rounded bg-teal-100 dark:bg-teal-900/30 border border-teal-300 dark:border-teal-700" />
                                <div className="w-10 h-6 rounded bg-teal-100 dark:bg-teal-900/30 border border-teal-300 dark:border-teal-700" />
                            </div>
                        </div>
                    </FeatureCard>

                    {/* Feature 5: Batch Operations */}
                    <FeatureCard
                        icon={<Users className="w-6 h-6" />}
                        title="批量操作"
                        description="框选多张卡片，一次性重新生成、删除或连线"
                        gradient="from-rose-500 to-red-500"
                        delay="0.4s"
                    >
                        <div className="mt-3 flex gap-2 flex-wrap">
                            {['重新生成', '批量删除', '智能连线'].map((label, i) => (
                                <div
                                    key={i}
                                    className="px-2 py-1 rounded-md bg-rose-100 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-700 text-xs text-rose-700 dark:text-rose-300 font-medium"
                                    style={{ animationDelay: `${i * 0.2}s` }}
                                >
                                    {label}
                                </div>
                            ))}
                        </div>
                    </FeatureCard>

                    {/* Feature 6: Cloud Sync */}
                    <FeatureCard
                        icon={<Cloud className="w-6 h-6" />}
                        title="云端同步"
                        description="Firebase 实时同步，多设备无缝切换"
                        gradient="from-indigo-500 to-blue-500"
                        delay="0.5s"
                    >
                        <div className="mt-3 flex items-center justify-center gap-3">
                            {['💻', '📱', '☁️'].map((emoji, i) => (
                                <div
                                    key={i}
                                    className="text-2xl animate-bounce"
                                    style={{ animationDelay: `${i * 0.3}s`, animationDuration: '1.5s' }}
                                >
                                    {emoji}
                                </div>
                            ))}
                        </div>
                    </FeatureCard>

                </div>

                {/* CTA Button */}
                <button
                    onClick={onDismiss}
                    className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 animate-slide-up overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative flex items-center gap-2">
                        开始创作
                        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    </span>
                </button>

                {/* Footer Hint */}
                <p className="mt-6 text-sm text-slate-500 dark:text-slate-500 animate-fade-in">
                    💡 提示：在画布底部输入文字，即可创建第一张 AI 卡片
                </p>
            </div>
        </div>
    );
}

// Reusable Feature Card Component
function FeatureCard({ icon, title, description, gradient, delay, children }) {
    return (
        <div
            className="group relative p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-slide-up"
            style={{ animationDelay: delay }}
        >
            {/* Gradient Icon Background */}
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-white">
                    {icon}
                </div>
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                {title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {description}
            </p>

            {/* Visual Example */}
            {children}

            {/* Hover Glow Effect */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`} />
        </div>
    );
}
