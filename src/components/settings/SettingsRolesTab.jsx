import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function SettingsRolesTab({ currentProvider, handleUpdateProvider }) {
    const roles = currentProvider.roles || {};

    const updateRole = (roleKey, value) => {
        const newRoles = {
            ...roles,
            [roleKey]: value
        };
        handleUpdateProvider('roles', newRoles);
    };

    return (
        <div className="space-y-6">


            <div className="p-4 bg-brand-50 dark:bg-brand-900/20 text-brand-800 dark:text-brand-200 rounded-xl text-sm border border-brand-100 dark:border-brand-900/30">
                <p className="font-bold mb-1">🎯 Model Assignment for {currentProvider.name || 'this provider'}</p>
                <p>Assign specific models to different functions. These settings are specific to <b>{currentProvider.name}</b>.</p>
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
                        onChange={(e) => updateRole('chat', e.target.value)}
                        placeholder={currentProvider.model || "google/gemini-3-pro-preview"}
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
                        onChange={(e) => updateRole('analysis', e.target.value)}
                        placeholder={currentProvider.model || "google/gemini-3-flash-preview"}
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
                    />
                </div>

                {/* Image Generation Model */}
                <div className="p-4 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100">🎨 Image Generation</h4>
                            <p className="text-xs text-slate-500 mt-1">Model for creating board backgrounds</p>
                        </div>
                        <div className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-xs font-mono text-slate-600 dark:text-slate-400">
                            image
                        </div>
                    </div>
                    <input
                        type="text"
                        value={roles.image || ''}
                        onChange={(e) => updateRole('image', e.target.value)}
                        placeholder={currentProvider.model || "google/gemini-3-pro-preview"}
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-500">
                <div className="flex gap-2 items-center mb-1 text-slate-600 dark:text-slate-300">
                    <AlertCircle size={14} />
                    <p className="font-bold">Important</p>
                </div>
                <p>These role assignments are saved <b>separately for each provider</b>. When you switch providers, the system will automatically switch to the roles configured for that provider.</p>
            </div>
        </div>
    );
}
