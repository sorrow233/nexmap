import React, { useState, useEffect } from 'react';
import { StickyNote, Target, Check, Loader2 } from 'lucide-react';
import { linkageService } from '../../services/linkageService';

const ChatSelectionMenu = ({ selection, onCaptureNote, onMarkTopic, t }) => {
    const [showUidPrompt, setShowUidPrompt] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, sending, success, error
    const [uidInput, setUidInput] = useState('');
    const [pendingText, setPendingText] = useState('');

    useEffect(() => {
        if (status === 'success') {
            const timer = setTimeout(() => setStatus('idle'), 2000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    if (!selection && !showUidPrompt) return null;

    const performSend = async (text) => {
        setStatus('sending');
        const result = await linkageService.sendToExternalProject(text);
        if (result.success) {
            setStatus('success');
        } else {
            setStatus('error');
            setTimeout(() => setStatus('idle'), 2000);
        }
    };

    const handleFlowClick = (e) => {
        e.stopPropagation();
        if (status !== 'idle') return;

        const existingUid = linkageService.getFlowStudioUserId();

        if (!existingUid) {
            setPendingText(selection.text);
            setShowUidPrompt(true);
        } else {
            performSend(selection.text);
        }
    };

    const handleUidSubmit = () => {
        if (uidInput.trim()) {
            linkageService.setFlowStudioUserId(uidInput.trim());
            performSend(pendingText);
            setShowUidPrompt(false);
            setUidInput('');
            setPendingText('');
        }
    };

    // UID 输入弹窗
    if (showUidPrompt) {
        return (
            <div
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick={() => setShowUidPrompt(false)}
            >
                <div
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-bounce-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <img src="/flowstudio-32x32.png" alt="FlowStudio" className="w-8 h-8" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">连接 FlowStudio</h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        请输入你的 FlowStudio 用户 ID (Firebase UID) 以启用静默同步功能。
                    </p>
                    <input
                        type="text"
                        value={uidInput}
                        onChange={(e) => setUidInput(e.target.value)}
                        placeholder="Firebase UID"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleUidSubmit()}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowUidPrompt(false)}
                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleUidSubmit}
                            disabled={!uidInput.trim()}
                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            确认
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed z-[110] flex items-center gap-1 -translate-x-1/2 -translate-y-[130%] animate-bounce-in transition-all backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 rounded-full px-1 py-1 shadow-2xl border border-white/20 dark:border-white/10"
            style={{
                top: selection.rect.top,
                left: selection.rect.left
            }}
        >
            <button
                onClick={onCaptureNote}
                className="text-slate-700 dark:text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-white/50 dark:hover:bg-white/10 transition-all active:scale-95"
            >
                <StickyNote size={13} className="text-amber-500" />
                笔记
            </button>
            <button
                onClick={onMarkTopic}
                className="text-slate-700 dark:text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-white/50 dark:hover:bg-white/10 transition-all active:scale-95"
            >
                <Target size={13} className="text-brand-500" />
                焦点
            </button>
            <button
                onClick={handleFlowClick}
                disabled={status !== 'idle'}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 ${status === 'success' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                        status === 'error' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                            'hover:bg-white/50 dark:hover:bg-white/10'
                    }`}
                title="Send to FlowStudio"
            >
                {status === 'sending' ? (
                    <Loader2 size={13} className="animate-spin text-brand-500" />
                ) : status === 'success' ? (
                    <Check size={13} />
                ) : (
                    <img src="/flowstudio-32x32.png" alt="Flow" className="w-4 h-4" />
                )}
                <span className={status === 'success' ? 'font-bold' : 'text-slate-700 dark:text-white'}>
                    {status === 'sending' ? '发送中' : status === 'success' ? '已添加' : status === 'error' ? '失败' : 'Flow'}
                </span>
            </button>
        </div>
    );
};

export default ChatSelectionMenu;
