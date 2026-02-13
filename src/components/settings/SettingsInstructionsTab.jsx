import React from 'react';
import { FileText, Info, Plus, Trash2, Globe2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    normalizeCustomInstructionsValue
} from '../../services/customInstructionsService';

const MAX_TITLE_LENGTH = 80;
const MAX_CONTENT_LENGTH = 1200;

const defaultInstruction = () => ({
    id: `ci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    content: '',
    isGlobal: false,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
});

const normalizeEditableInstruction = (item, index = 0) => {
    if (!item || typeof item !== 'object') return defaultInstruction();
    return {
        id: String(item.id || `ci_${Date.now().toString(36)}_${index}`),
        title: String(item.title || item.name || '').slice(0, MAX_TITLE_LENGTH),
        content: String(item.content || item.text || '').slice(0, MAX_CONTENT_LENGTH),
        isGlobal: item.isGlobal === true,
        enabled: item.enabled !== false,
        createdAt: Number(item.createdAt) || Date.now(),
        updatedAt: Number(item.updatedAt) || Date.now()
    };
};

const getEditableItems = (value) => {
    if (value && typeof value === 'object' && Array.isArray(value.items)) {
        return value.items.map((item, idx) => normalizeEditableInstruction(item, idx));
    }
    return normalizeCustomInstructionsValue(value).items.map((item, idx) => normalizeEditableInstruction(item, idx));
};

export default function SettingsInstructionsTab({ customInstructions, setCustomInstructions }) {
    const { t } = useLanguage();
    const items = getEditableItems(customInstructions);

    const updateItems = (updater) => {
        const current = getEditableItems(customInstructions);
        const next = typeof updater === 'function' ? updater(current) : updater;
        setCustomInstructions({
            items: (next || []).map((item, idx) => normalizeEditableInstruction(item, idx))
        });
    };

    const handleAddInstruction = (preset = null) => {
        const newItem = defaultInstruction();
        if (preset) {
            newItem.title = preset.slice(0, MAX_TITLE_LENGTH);
            newItem.content = preset.slice(0, MAX_CONTENT_LENGTH);
            newItem.updatedAt = Date.now();
        }
        updateItems(prev => [...prev, newItem]);
    };

    const handleRemoveInstruction = (id) => {
        updateItems(prev => prev.filter(item => item.id !== id));
    };

    const handleUpdateInstruction = (id, updates) => {
        updateItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            return {
                ...item,
                ...updates,
                updatedAt: Date.now()
            };
        }));
    };

    const examples = [
        t.settings?.exampleInstruction1 || 'Always respond in Japanese',
        t.settings?.exampleInstruction2 || 'I am a software engineer, use technical terms',
        t.settings?.exampleInstruction3 || 'Keep responses under 200 words'
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                        <FileText size={20} className="text-brand-500" />
                        {t.settings?.customInstructions || 'Custom Instructions'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {t.settings?.customInstructionsHelp || 'Instructions you add here will be included in every AI interaction across all cards and canvases.'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        {t.settings?.customInstructionsUnlimitedHint || '支持无限新增。可将单条指令设为“全局生效”，其余由每个画布单独选择开启。'}
                    </p>
                </div>
                <button
                    onClick={() => handleAddInstruction()}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-[0_8px_24px_rgba(6,182,212,0.3)] hover:bg-cyan-400 transition-colors"
                >
                    <Plus size={14} />
                    {t.settings?.addInstruction || '新增指令'}
                </button>
            </div>

            {items.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/15 p-6 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t.settings?.customInstructionsEmpty || '还没有任何自定义指令，点击右上角“新增指令”开始。'}
                    </p>
                </div>
            )}

            <div className="space-y-4">
                {items.map((item, idx) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-slate-400 min-w-[56px]">#{idx + 1}</span>
                            <input
                                value={item.title || ''}
                                onChange={(e) => handleUpdateInstruction(item.id, { title: e.target.value.slice(0, MAX_TITLE_LENGTH) })}
                                placeholder={t.settings?.instructionTitlePlaceholder || '指令标题（可选）'}
                                className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 outline-none focus:border-cyan-400"
                            />
                            <button
                                onClick={() => handleRemoveInstruction(item.id)}
                                className="rounded-lg border border-rose-300/40 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                                title={t.settings?.deleteInstruction || '删除'}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <textarea
                            value={item.content || ''}
                            onChange={(e) => handleUpdateInstruction(item.id, { content: e.target.value.slice(0, MAX_CONTENT_LENGTH) })}
                            placeholder={t.settings?.customInstructionsPlaceholder || 'Example: Always respond in a friendly, casual tone. Use bullet points for lists. Prefer concise answers.'}
                            className="w-full min-h-[120px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 p-3 text-sm text-slate-700 dark:text-slate-100 outline-none focus:border-cyan-400 resize-y custom-scrollbar"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                                <label className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={item.enabled !== false}
                                        onChange={(e) => handleUpdateInstruction(item.id, { enabled: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-400"
                                    />
                                    {t.settings?.instructionEnabled || '启用'}
                                </label>
                                <label className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={item.isGlobal === true}
                                        onChange={(e) => handleUpdateInstruction(item.id, { isGlobal: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-400"
                                    />
                                    <Globe2 size={12} />
                                    {t.settings?.instructionGlobal || '全局生效'}
                                </label>
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                                {(item.content || '').length} / {MAX_CONTENT_LENGTH}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-brand-50/50 dark:bg-brand-900/10 rounded-xl border border-brand-100 dark:border-brand-500/20 flex gap-3">
                <Info size={18} className="text-brand-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <p className="font-bold text-brand-700 dark:text-brand-300 mb-1">
                        {t.settings?.customInstructionsNote || 'How it works'}
                    </p>
                    {t.settings?.customInstructionsInfo || 'Your instructions are prepended to every AI request. Use them to set language preferences, response styles, or domain-specific context that should apply globally.'}
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t.settings?.exampleInstructions || 'Example Instructions'}
                </p>
                <div className="grid gap-2">
                    {examples.map((example, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAddInstruction(example)}
                            className="text-left px-4 py-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 
                                rounded-xl text-sm text-slate-600 dark:text-slate-300 transition-colors
                                border border-slate-100 dark:border-white/5 hover:border-brand-200 dark:hover:border-brand-500/30"
                        >
                            + {example}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
