import React, { useMemo } from 'react';
import { Globe, Layers3, Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import SettingsUsageSummaryCard from './SettingsUsageSummaryCard';
import {
    createInstructionId,
    defaultInstruction,
    getEditableItems,
    normalizeEditableInstruction
} from './instructions/helpers';

const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'zh', name: 'Chinese', native: '简体中文' },
    { code: 'ja', name: 'Japanese', native: '日本語' }
];

function LanguageChip({ active, label, caption, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`rounded-[24px] border px-4 py-3 text-left transition-all duration-200 ${active
                ? 'border-[#eadbc9] bg-[#fffaf3] text-[#2f241a] shadow-[0_14px_28px_rgba(93,75,52,0.08)] dark:border-slate-600/70 dark:bg-[#1b2430] dark:text-white dark:shadow-[0_16px_34px_rgba(2,6,23,0.42)]'
                : 'border-[#efe4d8] bg-[rgba(255,252,247,0.84)] text-[#665746] hover:bg-white dark:border-slate-800/80 dark:bg-[#141c26]/90 dark:text-slate-200 dark:hover:border-slate-700/80 dark:hover:bg-[#1a2330]'
                }`}
        >
            <div className="text-sm font-semibold">{label}</div>
            <div className={`mt-1 text-xs ${active ? 'text-[#8e7c68] dark:text-slate-300/70' : 'text-[#938270] dark:text-slate-400'}`}>{caption}</div>
        </button>
    );
}

export default function SettingsBasicSection({
    customInstructions,
    setCustomInstructions,
    advancedInstructionCount = 0,
    onOpenAdvancedInstructions
}) {
    const { language, setLanguage, t } = useLanguage();

    const primaryInstruction = useMemo(() => {
        const items = getEditableItems(customInstructions);
        return items.find(item => item.isGlobal) || items[0] || null;
    }, [customInstructions]);

    const handleLanguageChange = (code) => {
        setLanguage(code);
        localStorage.setItem('userLanguage', code);
    };

    const handlePrimaryInstructionChange = (value) => {
        setCustomInstructions((prevValue) => {
            const current = getEditableItems(prevValue);
            const targetIndex = current.findIndex(item => item.isGlobal);
            const now = Date.now();
            const next = [...current];

            if (targetIndex >= 0) {
                next[targetIndex] = normalizeEditableInstruction({
                    ...next[targetIndex],
                    title: next[targetIndex].title || '默认回复规则',
                    content: value,
                    isGlobal: true,
                    enabled: true,
                    updatedAt: now
                });
            } else {
                next.unshift(normalizeEditableInstruction({
                    ...defaultInstruction(),
                    id: createInstructionId(),
                    title: '默认回复规则',
                    content: value,
                    isGlobal: true,
                    enabled: true,
                    createdAt: now,
                    updatedAt: now
                }));
            }

            return {
                items: next.map((item, idx) => normalizeEditableInstruction(item, idx))
            };
        });
    };

    return (
        <section className="space-y-6">
            <SettingsUsageSummaryCard />

            <div className="grid gap-6 xl:grid-cols-[0.95fr,1.2fr]">
                <div className="rounded-[30px] border border-[#eee3d7] bg-[rgba(255,252,247,0.82)] p-6 shadow-[0_20px_48px_rgba(95,74,50,0.06)] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-[#141c26]/90">
                    <div className="flex items-center gap-3">
                        <div className="rounded-[18px] bg-[#e8eff4] p-2.5 text-[#647f92] dark:bg-slate-800/80 dark:text-slate-200">
                            <Globe size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-[#2f241a] dark:text-white">
                                {t.settings.language || '语言'}
                            </h3>
                            <p className="text-sm leading-7 text-[#7b6a58] dark:text-slate-300/80">
                                {t.settings.languageChoose || '选择界面显示语言。'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {LANGUAGES.map((lang) => (
                            <LanguageChip
                                key={lang.code}
                                active={language === lang.code}
                                label={lang.native}
                                caption={lang.name}
                                onClick={() => handleLanguageChange(lang.code)}
                            />
                        ))}
                    </div>
                </div>

                <div className="rounded-[30px] border border-[#eee3d7] bg-[rgba(255,252,247,0.82)] p-6 shadow-[0_20px_48px_rgba(95,74,50,0.06)] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-[#141c26]/90">
                    <div className="flex items-center gap-3">
                        <div className="rounded-[18px] bg-[#faedd7] p-2.5 text-[#af7c36] dark:bg-slate-800/80 dark:text-slate-200">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-[#2f241a] dark:text-white">
                                默认回复规则
                            </h3>
                            <p className="text-sm leading-7 text-[#7b6a58] dark:text-slate-300/80">
                                大多数用户只需要这里的一条全局规则，不必再管理一堆指令。
                            </p>
                        </div>
                    </div>

                    <textarea
                        value={primaryInstruction?.content || ''}
                        onChange={(e) => handlePrimaryInstructionChange(e.target.value)}
                        placeholder={t.settings?.customInstructionsPlaceholder || '示例：请用轻松友好的语气回复。使用项目符号列表。回答尽量简洁。'}
                        className="mt-5 min-h-[168px] w-full rounded-[26px] border border-[#eee3d7] bg-[#fffdf9] px-5 py-4 text-sm leading-7 text-[#43372c] outline-none transition-all placeholder:text-[#b0a08e] focus:border-[#e8d5bb] focus:ring-4 focus:ring-[#f4e7d2] dark:border-white/10 dark:bg-[#111826]/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
                    />

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#eee3d7] bg-[rgba(255,250,244,0.88)] px-4 py-3 text-sm backdrop-blur-xl dark:border-slate-800/70 dark:bg-[#17202b]/86">
                        <div className="flex items-center gap-2 text-[#756553] dark:text-slate-300">
                            <Layers3 size={14} />
                            其余高级指令数量：<span className="font-semibold text-[#2f241a] dark:text-white">{advancedInstructionCount}</span>
                        </div>
                        <button
                            onClick={onOpenAdvancedInstructions}
                            className="rounded-full border border-[#ebdbca] bg-[#fbf3e7] px-4 py-1.5 text-xs font-semibold text-[#8c6b47] transition-all hover:bg-[#fffaf2] dark:border-slate-700/80 dark:bg-[#1a2330] dark:text-slate-100 dark:hover:bg-[#202b38]"
                        >
                            管理高级指令
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
