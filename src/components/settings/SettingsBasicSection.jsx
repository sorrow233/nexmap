import React, { useMemo } from 'react';
import { Layers3, Sparkles } from 'lucide-react';
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

const BASIC_COPY = {
    zh: {
        summaryTitle: '常用项',
        summaryDesc: '语言 / 回复方式',
        languageTitle: '界面语言',
        languageDesc: '只改界面',
        instructionTitle: 'AI 怎么回你',
        instructionDesc: '先点风格，再补一句',
        manageAdvanced: '管理高级指令',
        textareaLabel: '补充',
        textareaHint: '可留空。例：先给结论，再用短列表说明原因。',
        helperText: '全局生效',
        advancedCount: '高级指令',
        presets: [
            {
                label: '简洁',
                hint: '直接给结论',
                content: '请优先直接回答结论，控制篇幅，必要时用简短列表说明重点。'
            },
            {
                label: '耐心',
                hint: '像老师一样讲',
                content: '请用耐心、友好的语气解释问题，先说结论，再分步骤补充原因和做法。'
            },
            {
                label: '步骤',
                hint: '按步骤写',
                content: '请把回答拆成清晰步骤，每一步都尽量短，方便我直接照着做。'
            },
            {
                label: '双语',
                hint: '中文 + English',
                content: '请先用中文回答，再附上一版简洁英文摘要；格式尽量整齐好扫读。'
            }
        ]
    },
    en: {
        summaryTitle: 'Common',
        summaryDesc: 'Language / Reply',
        languageTitle: 'Interface language',
        languageDesc: 'UI only',
        instructionTitle: 'How AI should reply',
        instructionDesc: 'Pick one, then add one line if needed.',
        manageAdvanced: 'Manage advanced rules',
        textareaLabel: 'Extra line',
        textareaHint: 'Optional. Example: give the answer first, then list short reasons.',
        helperText: 'Global',
        advancedCount: 'Advanced rules',
        presets: [
            {
                label: 'Concise',
                hint: 'Answer first',
                content: 'Please lead with the conclusion, keep the answer concise, and use short bullet points when helpful.'
            },
            {
                label: 'Patient',
                hint: 'Explain gently',
                content: 'Please explain in a patient, friendly tone. Start with the conclusion, then walk through the reasoning step by step.'
            },
            {
                label: 'Steps',
                hint: 'Easy to follow',
                content: 'Please break the answer into clear steps, keep each step short, and make it easy to follow directly.'
            },
            {
                label: 'Bilingual',
                hint: 'Chinese + English',
                content: 'Please answer in Chinese first, then add a short English summary with clean formatting.'
            }
        ]
    },
    ja: {
        summaryTitle: '基本',
        summaryDesc: '言語 / 返答',
        languageTitle: '表示言語',
        languageDesc: '画面のみ',
        instructionTitle: 'AI の返答スタイル',
        instructionDesc: '先に選び、必要なら一文追加',
        manageAdvanced: '高度なルールを管理',
        textareaLabel: '追加',
        textareaHint: '空でも大丈夫です。例: まず結論、その後に短い箇条書きで理由を説明してください。',
        helperText: '全体適用',
        advancedCount: '高度なルール',
        presets: [
            {
                label: '簡潔',
                hint: 'まず結論',
                content: 'まず結論を簡潔に伝え、必要な場合だけ短い箇条書きで要点を補足してください。'
            },
            {
                label: '丁寧',
                hint: 'やさしく説明',
                content: 'やさしく丁寧な口調で説明し、最初に結論、その後に理由と手順を順番に補足してください。'
            },
            {
                label: '手順',
                hint: 'そのまま実行しやすく',
                content: '回答をわかりやすい手順に分け、各手順は短く、すぐ実行できる形で示してください。'
            },
            {
                label: '二言語',
                hint: '中国語 + English',
                content: '最初に中国語で回答し、その後に短い英語サマリーを整った形式で添えてください。'
            }
        ]
    }
};

function StepBadge({ number, tone }) {
    return (
        <div className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${tone}`}>
            {number}
        </div>
    );
}

function OptionChip({ active, label, caption, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`rounded-full border px-2.5 py-1.5 text-left transition-all duration-200 ${active
                ? 'border-[#d8bea1] bg-[#fff6eb] text-[#2f241a]'
                : 'border-[#e7dccf] bg-white text-[#665746] hover:bg-[#fffaf4] dark:border-white/10 dark:bg-white/6 dark:text-slate-200 dark:hover:border-white/20'
                }`}
        >
            <div className="text-xs font-semibold leading-none">{label}</div>
            {caption && (
                <div className={`mt-1 text-[10px] leading-none ${active ? 'text-[#8e7c68] dark:text-slate-300/70' : 'text-[#938270] dark:text-slate-400'}`}>{caption}</div>
            )}
        </button>
    );
}

function SettingsRow({ step, stepTone, title, description, children }) {
    return (
        <div className="grid gap-3 px-3 py-3 sm:grid-cols-[170px,minmax(0,1fr)] sm:px-4">
            <div className="flex gap-3">
                <StepBadge number={step} tone={stepTone} />
                <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-[#2f241a] dark:text-white">{title}</h3>
                    <p className="mt-0.5 text-[10px] leading-4 text-[#82715f] dark:text-slate-300/80">{description}</p>
                </div>
            </div>
            <div className="min-w-0">{children}</div>
        </div>
    );
}

export default function SettingsBasicSection({
    customInstructions,
    setCustomInstructions,
    advancedInstructionCount = 0,
    onOpenAdvancedInstructions
}) {
    const { language, setLanguage, t } = useLanguage();
    const copy = BASIC_COPY[language] || BASIC_COPY.en;

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
        <section className="space-y-3">
            <SettingsUsageSummaryCard />

            <div className="overflow-hidden rounded-[18px] border border-[#e9decf] bg-[#fffdf8] dark:border-white/10 dark:bg-white/6">
                <div className="border-b border-[#eee3d7] px-3 py-2 sm:px-4 dark:border-white/10">
                    <div className="text-xs font-semibold text-[#2f241a] dark:text-white">{copy.summaryTitle}</div>
                    <p className="mt-0.5 text-[10px] leading-4 text-[#84725f] dark:text-slate-300/80">{copy.summaryDesc}</p>
                </div>

                <div className="divide-y divide-[#eee3d7] dark:divide-white/10">
                    <SettingsRow
                        step="1"
                        stepTone="bg-[#e8eff4] text-[#647f92] dark:bg-white/10 dark:text-slate-200"
                        title={copy.languageTitle || t.settings.language || '语言'}
                        description={copy.languageDesc || t.settings.languageChoose || '选择界面显示语言。'}
                    >
                        <div className="flex flex-wrap gap-2">
                            {LANGUAGES.map((lang) => (
                                <OptionChip
                                    key={lang.code}
                                    active={language === lang.code}
                                    label={lang.native}
                                    caption={lang.name}
                                    onClick={() => handleLanguageChange(lang.code)}
                                />
                            ))}
                        </div>
                    </SettingsRow>

                    <SettingsRow
                        step="2"
                        stepTone="bg-[#faedd7] text-[#af7c36] dark:bg-white/10 dark:text-slate-200"
                        title={copy.instructionTitle}
                        description={copy.instructionDesc}
                    >
                        <div className="flex flex-wrap gap-2">
                            {copy.presets.map((preset) => (
                                <OptionChip
                                    key={preset.label}
                                    active={(primaryInstruction?.content || '') === preset.content}
                                    label={preset.label}
                                    caption={preset.hint}
                                    onClick={() => handlePrimaryInstructionChange(preset.content)}
                                />
                            ))}
                        </div>

                        <div className="mt-3">
                            <label className="mb-1.5 block text-[10px] font-medium text-[#7f6c59] dark:text-slate-300/80">
                                {copy.textareaLabel}
                            </label>
                            <textarea
                                value={primaryInstruction?.content || ''}
                                onChange={(e) => handlePrimaryInstructionChange(e.target.value)}
                                placeholder={copy.textareaHint || t.settings?.customInstructionsPlaceholder || '示例：请用轻松友好的语气回复。使用项目符号列表。回答尽量简洁。'}
                                className="min-h-[88px] w-full rounded-[14px] border border-[#e7dccf] bg-white px-3 py-2.5 text-xs leading-6 text-[#43372c] outline-none transition-all placeholder:text-[#b0a08e] focus:border-[#dcc2a3] focus:ring-4 focus:ring-[#f6ead8] dark:border-white/10 dark:bg-[#111826]/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
                            />
                        </div>

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-1.5 text-[10px] text-[#7e6c5a] dark:text-slate-300/80">
                                <Sparkles size={12} />
                                {copy.helperText}
                            </div>
                            <button
                                onClick={onOpenAdvancedInstructions}
                                className="inline-flex items-center gap-1.5 self-start rounded-full border border-[#e8dccd] bg-[#fffaf3] px-2.5 py-1 text-[10px] font-semibold text-[#8c6b47] transition-all hover:bg-[#fff6eb] dark:border-white/10 dark:bg-white/8 dark:text-slate-200 dark:hover:bg-white/12"
                            >
                                <Layers3 size={12} />
                                {copy.manageAdvanced}
                                <span className="rounded-full bg-[#f2e5d4] px-1.5 py-0.5 text-[9px] text-[#6c5844] dark:bg-white/10 dark:text-slate-200">
                                    {advancedInstructionCount}
                                </span>
                            </button>
                        </div>
                    </SettingsRow>
                </div>
            </div>
        </section>
    );
}
