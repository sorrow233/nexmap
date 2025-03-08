import React from 'react';

export default function SettingsRolesTab({ roles, setRoles, currentProvider }) {
    return (
        <div className="space-y-6 animate-slide-up">
            <div className="p-4 bg-brand-50 dark:bg-brand-900/20 text-brand-800 dark:text-brand-200 rounded-xl text-sm border border-brand-100 dark:border-brand-900/30">
                <p className="font-bold mb-1">🎯 Model Assignment</p>
                <p>Assign specific models to different functions for optimal performance and cost.</p>
            </div>

            <div className="space-y-4">
                {/* Chat Model */}
                <div className="p-4 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100">💬 Chat Conversations</h4>
                            <p className="text-xs text-slate-500 mt-1">Main model for all card conversations</p>
                        </div>
                        <div className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-xs font-mono text-slate-600 dark:text-slate-400">
                            chat
                        </div>
                    </div>
                    <input
                        type="text"
                        value={roles.chat || ''}
                        onChange={(e) => setRoles(prev => ({ ...prev, chat: e.target.value }))}
                        placeholder={currentProvider.model || "google/gemini-3-flash-preview"}
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
                    />
                </div>

                {/* Analysis Model */}
                <div className="p-4 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100">🌱 Sprout Ideas (Analysis)</h4>
                            <p className="text-xs text-slate-500 mt-1">Model for generating follow-up questions</p>
                        </div>
                        <div className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-xs font-mono text-slate-600 dark:text-slate-400">
                            analysis
                        </div>
                    </div>
                    <input
                        type="text"
                        value={roles.analysis || ''}
                        onChange={(e) => setRoles(prev => ({ ...prev, analysis: e.target.value }))}
                        placeholder={currentProvider.model || "google/gemini-3-pro-preview"}
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-500">
                <p className="font-bold mb-1">💡 Tip:</p>
                <p>Use faster models (like flash) for chat, and smarter models (like pro) for analysis to balance cost and quality.</p>
            </div>
        </div>
    );
}
