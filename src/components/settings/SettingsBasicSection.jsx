import React, { useMemo } from 'react';
import { Globe, Layers3, Sparkles, Wand2 } from 'lucide-react';
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
        languageTitle: '界面语言',
        languageDesc: '只改这里，就能立刻切换整个界面的阅读习惯。',
        instructionTitle: '默认回复规则',
        instructionDesc: '大多数用户只需要写这一条，AI 就会一直按这个风格回应。',
        presetsTitle: '常用预设',
        presetsDesc: '不想自己写时，点一个就能直接开始。',
        advancedCount: '其余高级指令',
        manageAdvanced: '管理高级指令',
        textareaHint: '一句话描述你想要的回答方式，例如：请直接给结论，并用短列表说明理由。',
        helperText: '这条规则会默认作用于所有对话；更复杂的多条指令仍可在高级设置里管理。',
        presets: [
            {
                label: '更简洁',
                hint: '先给结论',
                content: '请优先直接回答结论，控制篇幅，必要时用简短列表说明重点。'
            },
            {
                label: '更耐心',
                hint: '像老师一样讲',
                content: '请用耐心、友好的语气解释问题，先说结论，再分步骤补充原因和做法。'
            },
            {
                label: '步骤清晰',
                hint: '按步骤执行',
                content: '请把回答拆成清晰步骤，每一步都尽量短，方便我直接照着做。'
            },
            {
                label: '双语输出',
                hint: '中文 + English',
                content: '请先用中文回答，再附上一版简洁英文摘要；格式尽量整齐好扫读。'
            }
        ]
    },
    en: {
        languageTitle: 'Interface language',
        languageDesc: 'Change this once and the whole app follows the same reading style.',
        instructionTitle: 'Default reply rule',
        instructionDesc: 'Most people only need one global rule here for the AI to stay consistent.',
        presetsTitle: 'Quick presets',
        presetsDesc: 'Pick one if you do not want to write the rule from scratch.',
        advancedCount: 'Other advanced rules',
        manageAdvanced: 'Manage advanced rules',
        textareaHint: 'Describe the reply style you want in one sentence, for example: answer first, then give short reasons in bullets.',
        helperText: 'This rule applies to all chats by default. Multi-rule setups are still available in Advanced settings.',
        presets: [
            {
                label: 'More concise',
                hint: 'Answer first',
                content: 'Please lead with the conclusion, keep the answer concise, and use short bullet points when helpful.'
            },
            {
                label: 'More patient',
                hint: 'Explain gently',
                content: 'Please explain in a patient, friendly tone. Start with the conclusion, then walk through the reasoning step by step.'
            },
            {
                label: 'Step by step',
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
        languageTitle: '表示言語',
        languageDesc: 'ここを変えるだけで、画面全体の読みやすさをすぐ切り替えられます。',
        instructionTitle: 'デフォルト返信ルール',
        instructionDesc: 'ほとんどの人はここに 1 つだけ書けば、AI の返答方針が安定します。',
        presetsTitle: 'よく使うプリセット',
        presetsDesc: '自分で考えたくないときは、1 つ選ぶだけで始められます。',
        advancedCount: 'その他の高度なルール',
        manageAdvanced: '高度なルールを管理',
        textareaHint: 'ほしい返答スタイルを 1 文で書いてください。例: まず結論、その後に短い箇条書きで理由を説明してください。',
        helperText: 'このルールはすべての会話に既定で適用されます。複数ルールの管理は高度な設定で続けて使えます。',
        presets: [
            {
                label: '簡潔に',
                hint: 'まず結論',
                content: 'まず結論を簡潔に伝え、必要な場合だけ短い箇条書きで要点を補足してください。'
            },
            {
                label: '丁寧に',
                hint: 'やさしく説明',
                content: 'やさしく丁寧な口調で説明し、最初に結論、その後に理由と手順を順番に補足してください。'
            },
            {
                label: '手順重視',
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

function LanguageChip({ active, label, caption, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ${active
                ? 'border-[#dec5a8] bg-[#fff8ef] text-[#2f241a] shadow-[0_10px_22px_rgba(93,75,52,0.08)]'
                : 'border-[#ece1d4] bg-white/82 text-[#665746] hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-200 dark:hover:border-white/20'
                }`}
        >
            <div className="text-sm font-semibold">{label}</div>
            <div className={`mt-1 text-xs ${active ? 'text-[#8e7c68] dark:text-slate-300/70' : 'text-[#938270] dark:text-slate-400'}`}>{caption}</div>
        </button>
    );
}

function PresetButton({ label, hint, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-2xl border border-[#ece1d4] bg-white/82 px-3.5 py-3 text-left transition-all hover:border-[#dec5a8] hover:bg-[#fff8ef] dark:border-white/10 dark:bg-white/6 dark:hover:bg-white/10"
        >
            <div className="text-sm font-semibold text-[#43372c] dark:text-white">{label}</div>
            <div className="mt-1 text-xs text-[#8d7b68] dark:text-slate-300/70">{hint}</div>
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
        <section className="space-y-5">
            <SettingsUsageSummaryCard />

            <div className="grid gap-5 xl:grid-cols-[280px,minmax(0,1fr)]">
                <div className="rounded-[26px] border border-[#ece0d2] bg-[rgba(255,252,247,0.86)] p-5 shadow-[0_12px_30px_rgba(95,74,50,0.05)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/6">
                    <div className="flex items-center gap-3">
                        <div className="rounded-[16px] bg-[#e8eff4] p-2.5 text-[#647f92] dark:bg-white/10 dark:text-slate-200">
                            <Globe size={17} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-[#2f241a] dark:text-white">
                                {copy.languageTitle || t.settings.language || '语言'}
                            </h3>
                            <p className="text-sm leading-6 text-[#7b6a58] dark:text-slate-300/80">
                                {copy.languageDesc || t.settings.languageChoose || '选择界面显示语言。'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3">
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

                <div className="rounded-[26px] border border-[#ece0d2] bg-[rgba(255,252,247,0.86)] p-5 shadow-[0_12px_30px_rgba(95,74,50,0.05)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-[16px] bg-[#faedd7] p-2.5 text-[#af7c36] dark:bg-white/10 dark:text-slate-200">
                                <Sparkles size={17} />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-[#2f241a] dark:text-white">
                                    {copy.instructionTitle}
                                </h3>
                                <p className="text-sm leading-6 text-[#7b6a58] dark:text-slate-300/80">
                                    {copy.instructionDesc}
                                </p>
                            </div>
                        </div>

                        <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#ebdfd1] bg-[#fff8ef] px-3 py-1.5 text-xs font-medium text-[#7f6b56] dark:border-white/10 dark:bg-white/8 dark:text-slate-200">
                            <Layers3 size={13} />
                            {copy.advancedCount}
                            <span className="font-semibold text-[#2f241a] dark:text-white">{advancedInstructionCount}</span>
                        </div>
                    </div>

                    <div className="mt-5 rounded-[22px] border border-[#ece1d4] bg-[#fffaf4] p-4 dark:border-white/10 dark:bg-white/6">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9c856c] dark:text-slate-300/70">
                            <Wand2 size={14} />
                            {copy.presetsTitle}
                        </div>
                        <p className="mt-1 text-sm text-[#7b6a58] dark:text-slate-300/80">{copy.presetsDesc}</p>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {copy.presets.map((preset) => (
                                <PresetButton
                                    key={preset.label}
                                    label={preset.label}
                                    hint={preset.hint}
                                    onClick={() => handlePrimaryInstructionChange(preset.content)}
                                />
                            ))}
                        </div>
                    </div>

                    <textarea
                        value={primaryInstruction?.content || ''}
                        onChange={(e) => handlePrimaryInstructionChange(e.target.value)}
                        placeholder={copy.textareaHint || t.settings?.customInstructionsPlaceholder || '示例：请用轻松友好的语气回复。使用项目符号列表。回答尽量简洁。'}
                        className="mt-4 min-h-[148px] w-full rounded-[22px] border border-[#ece1d4] bg-[#fffdf9] px-4 py-3.5 text-sm leading-7 text-[#43372c] outline-none transition-all placeholder:text-[#b0a08e] focus:border-[#e8d5bb] focus:ring-4 focus:ring-[#f4e7d2] dark:border-white/10 dark:bg-[#111826]/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
                    />

                    <div className="mt-3 flex flex-col gap-3 border-t border-[#eee3d7] pt-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm leading-6 text-[#7b6a58] dark:text-slate-300/80">
                            {copy.helperText}
                        </p>
                        <button
                            onClick={onOpenAdvancedInstructions}
                            className="rounded-full border border-[#ebdbca] bg-[#fbf3e7] px-4 py-2 text-xs font-semibold text-[#8c6b47] transition-all hover:bg-[#fffaf2] dark:border-white/10 dark:bg-white/8 dark:text-slate-200 dark:hover:bg-white/12"
                        >
                            {copy.manageAdvanced}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
