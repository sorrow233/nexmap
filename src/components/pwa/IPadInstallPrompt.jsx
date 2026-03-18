import React, { useEffect, useState } from 'react';
import { ChevronDown, Home, PlusSquare, Share2, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { isStandaloneDisplayMode, shouldShowIPadInstallPrompt } from '../../utils/browser';

const PROMPT_STATE_KEY = 'nexmap_ipad_install_prompt_state_v1';
const PROMPT_DELAY_MS = 1800;

const promptCopy = {
    en: {
        badge: 'Dismiss once to stop reminders',
        eyebrow: 'IPAD SAFARI',
        title: 'Add NexMap to your Home Screen',
        description: 'Safari does not expose a direct install button here, but you can still pin NexMap to the Home Screen and reopen it like an app.',
        stepLabel: 'Step',
        showSteps: 'Show steps',
        hideSteps: 'Hide steps',
        dismiss: 'Do not remind me again',
        closeLabel: 'Close install reminder',
        steps: [
            'Tap the Share button in Safari.',
            'Choose "Add to Home Screen" from the menu.',
            'Tap "Add" and reopen NexMap from your Home Screen.'
        ],
        note: 'When you close this card, this iPad will not be prompted again.'
    },
    zh: {
        badge: '关闭后不再提醒',
        eyebrow: 'IPAD SAFARI',
        title: '把 NexMap 添加到桌面',
        description: 'Safari 这里不能直接拉起系统安装按钮，但你仍然可以把 NexMap 固定到主屏幕，以后像 App 一样直接打开。',
        stepLabel: '步骤',
        showSteps: '查看步骤',
        hideSteps: '收起步骤',
        dismiss: '不再提示',
        closeLabel: '关闭添加到桌面提醒',
        steps: [
            '先点 Safari 里的“分享”按钮。',
            '在弹出菜单里找到“添加到主屏幕”。',
            '点“添加”，之后就能从桌面直接打开 NexMap。'
        ],
        note: '只要你这次关掉，这台 iPad 后面就不会再收到这个提醒。'
    },
    ja: {
        badge: '一度閉じると再表示しません',
        eyebrow: 'IPAD SAFARI',
        title: 'NexMap をホーム画面に追加',
        description: 'Safari ではここから直接インストール画面を開けませんが、ホーム画面に追加してアプリのように起動できます。',
        stepLabel: 'STEP',
        showSteps: '手順を見る',
        hideSteps: '手順を閉じる',
        dismiss: '今後は表示しない',
        closeLabel: 'ホーム画面追加の案内を閉じる',
        steps: [
            'Safari の共有ボタンをタップします。',
            'メニューから「ホーム画面に追加」を選びます。',
            '「追加」を押すと、次回からホーム画面から NexMap を開けます。'
        ],
        note: 'このカードを閉じると、この iPad では今後表示しません。'
    },
    ko: {
        badge: '한 번 닫으면 다시 알리지 않음',
        eyebrow: 'IPAD SAFARI',
        title: 'NexMap를 홈 화면에 추가',
        description: 'Safari에서는 여기서 바로 설치 패널을 띄울 수 없지만, 홈 화면에 추가해서 앱처럼 바로 실행할 수 있습니다.',
        stepLabel: 'STEP',
        showSteps: '방법 보기',
        hideSteps: '방법 숨기기',
        dismiss: '다시 알리지 않기',
        closeLabel: '홈 화면 추가 안내 닫기',
        steps: [
            'Safari의 공유 버튼을 누릅니다.',
            '메뉴에서 "홈 화면에 추가"를 선택합니다.',
            '"추가"를 누르면 다음부터 홈 화면에서 NexMap를 바로 열 수 있습니다.'
        ],
        note: '이 카드를 닫으면 이 iPad에서는 다시 보이지 않습니다.'
    }
};

const stepIcons = [Share2, PlusSquare, Home];

function readPromptState() {
    try {
        return localStorage.getItem(PROMPT_STATE_KEY);
    }
    catch (error) {
        console.warn('[PWA] Failed to read iPad install prompt state:', error);
        return null;
    }
}

function writePromptState(value) {
    try {
        localStorage.setItem(PROMPT_STATE_KEY, value);
    }
    catch (error) {
        console.warn('[PWA] Failed to persist iPad install prompt state:', error);
    }
}

function StepRow({ icon: Icon, index, label, text }) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-200">
                <Icon size={18} strokeWidth={2.1} />
            </div>
            <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/55">
                    {label} {index + 1}
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-100">
                    {text}
                </div>
            </div>
        </div>
    );
}

export default function IPadInstallPrompt() {
    const { language } = useLanguage();
    const copy = promptCopy[language] || promptCopy.en;
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (!shouldShowIPadInstallPrompt()) return undefined;
        if (readPromptState()) return undefined;

        const revealPrompt = () => {
            if (isStandaloneDisplayMode()) {
                writePromptState('installed');
                return;
            }

            setIsVisible(true);
        };

        const timerId = window.setTimeout(revealPrompt, PROMPT_DELAY_MS);
        const syncInstallState = () => {
            if (!isStandaloneDisplayMode()) return;

            writePromptState('installed');
            setIsVisible(false);
        };

        window.addEventListener('focus', syncInstallState);
        document.addEventListener('visibilitychange', syncInstallState);

        return () => {
            window.clearTimeout(timerId);
            window.removeEventListener('focus', syncInstallState);
            document.removeEventListener('visibilitychange', syncInstallState);
        };
    }, []);

    const handleDismiss = () => {
        writePromptState('dismissed');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
            <div className="mx-auto flex w-full max-w-[1100px] justify-end">
                <div className="pointer-events-auto w-full max-w-[420px] overflow-hidden rounded-[28px] border border-cyan-300/12 bg-[#081120]/92 text-white shadow-[0_24px_70px_rgba(2,8,23,0.52)] backdrop-blur-xl">
                    <div className="bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_48%),linear-gradient(180deg,rgba(9,18,34,0.98),rgba(7,14,28,0.94))] p-5">
                        <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-300/10 bg-cyan-400/10 text-cyan-100">
                                <Home size={26} strokeWidth={2.1} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="inline-flex items-center rounded-full border border-cyan-300/12 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/75">
                                    {copy.badge}
                                </div>
                                <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-100/42">
                                    {copy.eyebrow}
                                </div>
                                <h3 className="mt-2 text-[22px] font-semibold tracking-tight text-white">
                                    {copy.title}
                                </h3>
                                <p className="mt-3 text-sm leading-6 text-slate-300">
                                    {copy.description}
                                </p>
                            </div>

                            <button
                                type="button"
                                aria-label={copy.closeLabel}
                                onClick={handleDismiss}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.05] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                            >
                                <X size={18} strokeWidth={2.2} />
                            </button>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsExpanded((value) => !value)}
                                className="inline-flex items-center gap-2 rounded-full border border-cyan-300/14 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-50 transition hover:bg-cyan-400/14"
                            >
                                <Share2 size={16} strokeWidth={2.2} />
                                {isExpanded ? copy.hideSteps : copy.showSteps}
                                <ChevronDown
                                    size={16}
                                    strokeWidth={2.2}
                                    className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            </button>

                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
                            >
                                {copy.dismiss}
                            </button>
                        </div>

                        {isExpanded && (
                            <div className="mt-4 space-y-3 rounded-[24px] border border-white/8 bg-[#0b162a]/85 p-4">
                                {copy.steps.map((step, index) => {
                                    const StepIcon = stepIcons[index] || Home;

                                    return (
                                        <StepRow
                                            key={`${step}-${index}`}
                                            icon={StepIcon}
                                            index={index}
                                            label={copy.stepLabel}
                                            text={step}
                                        />
                                    );
                                })}

                                <div className="rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.06] px-3 py-3 text-xs leading-5 text-cyan-50/82">
                                    {copy.note}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
