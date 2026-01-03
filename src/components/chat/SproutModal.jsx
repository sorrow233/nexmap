import React from 'react';
import { Sprout, X, Check } from 'lucide-react';

export default function SproutModal({
    isOpen,
    onClose,
    topics,
    selectedTopics,
    onToggleTopic,
    onConfirm
}) {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Sprout size={18} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">发散新想法</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-slate-500 mb-4 font-medium">{t.sprout?.selectTopic || t.chat?.selectTopic || "选择你想回答的问题:"}</p>
                    <div className="space-y-2">
                        {topics.map((topic, idx) => (
                            <div
                                key={idx}
                                onClick={() => onToggleTopic(topic)}
                                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 group
                                    ${selectedTopics.includes(topic)
                                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10'
                                        : 'border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-500/30'}`}
                            >
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors mt-0.5
                                    ${selectedTopics.includes(topic)
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'border-slate-300 dark:border-slate-600 group-hover:border-emerald-400'}`}
                                >
                                    {selectedTopics.includes(topic) && <Check size={12} strokeWidth={4} />}
                                </div>
                                <span className="text-slate-700 dark:text-slate-200 font-medium leading-snug text-[15px]">{topic}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 pt-2 bg-white dark:bg-slate-900 footer-gradient">
                    <button
                        onClick={onConfirm}
                        disabled={selectedTopics.length === 0}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/20 disabled:grayscale disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Sprout size={20} />
                        <span>{(t.sprout?.generateCards || "生成 {count} 张卡片").replace('{count}', selectedTopics.length)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
