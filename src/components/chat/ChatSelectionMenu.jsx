import React, { useEffect, useRef, useState } from 'react';
import { StickyNote, Target, Check, Loader2 } from 'lucide-react';
import { linkageService } from '../../services/linkageService';
import { getLinkageTarget, LINKAGE_TARGET_LIST } from '../../services/linkageTargets';

const createStatusMap = () => LINKAGE_TARGET_LIST.reduce((acc, target) => {
    acc[target.id] = 'idle';
    return acc;
}, {});

const ChatSelectionMenu = ({ selection, onCaptureNote, onMarkTopic }) => {
    const [statusByTarget, setStatusByTarget] = useState(() => createStatusMap());
    const [checkingTargetId, setCheckingTargetId] = useState('');
    const [savingTargetId, setSavingTargetId] = useState('');
    const [uidInput, setUidInput] = useState('');
    const [pendingText, setPendingText] = useState('');
    const [pendingTargetId, setPendingTargetId] = useState('');
    const resetTimersRef = useRef(new Map());

    useEffect(() => {
        return () => {
            for (const timer of resetTimersRef.current.values()) {
                clearTimeout(timer);
            }
            resetTimersRef.current.clear();
        };
    }, []);

    if (!selection && !pendingTargetId) return null;

    const pendingTarget = pendingTargetId ? getLinkageTarget(pendingTargetId) : null;
    const isBusy = Boolean(checkingTargetId || savingTargetId) || Object.values(statusByTarget).some(status => status === 'sending');

    const setTargetStatus = (targetId, status) => {
        setStatusByTarget(prev => ({
            ...prev,
            [targetId]: status
        }));
    };

    const scheduleStatusReset = (targetId, delay = 2000) => {
        const prevTimer = resetTimersRef.current.get(targetId);
        if (prevTimer) {
            clearTimeout(prevTimer);
        }

        const timer = setTimeout(() => {
            setStatusByTarget(prev => ({
                ...prev,
                [targetId]: 'idle'
            }));
            resetTimersRef.current.delete(targetId);
        }, delay);

        resetTimersRef.current.set(targetId, timer);
    };

    const performSend = async (targetId, text) => {
        setTargetStatus(targetId, 'sending');
        const result = await linkageService.sendToTarget(targetId, text);

        if (result.success) {
            setTargetStatus(targetId, 'success');
            scheduleStatusReset(targetId);
            return;
        }

        setTargetStatus(targetId, 'error');
        scheduleStatusReset(targetId);
    };

    const handleTargetClick = async (targetId, event) => {
        event.stopPropagation();
        if (isBusy || statusByTarget[targetId] !== 'idle' || !selection?.text) return;

        setCheckingTargetId(targetId);

        try {
            const existingUid = await linkageService.ensureTargetUserId(targetId);

            if (!existingUid) {
                setPendingText(selection.text);
                setPendingTargetId(targetId);
                setUidInput('');
                return;
            }

            await performSend(targetId, selection.text);
        } finally {
            setCheckingTargetId('');
        }
    };

    const closeUidPrompt = () => {
        if (savingTargetId) return;
        setPendingTargetId('');
        setUidInput('');
        setPendingText('');
    };

    const handleUidSubmit = async () => {
        if (!pendingTargetId || !uidInput.trim() || savingTargetId) return;

        const targetId = pendingTargetId;
        const textToSend = pendingText || selection?.text || '';

        setSavingTargetId(targetId);
        try {
            await linkageService.setTargetUserId(targetId, uidInput.trim());
            setPendingTargetId('');
            setUidInput('');
            setPendingText('');
            await performSend(targetId, textToSend);
        } finally {
            setSavingTargetId('');
        }
    };

    if (pendingTarget) {
        const isSavingUid = savingTargetId === pendingTarget.id;

        return (
            <div
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick={closeUidPrompt}
            >
                <div
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-bounce-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <img src={pendingTarget.iconPath} alt={pendingTarget.label} className="w-8 h-8" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">连接 {pendingTarget.label}</h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        请输入你的 {pendingTarget.label} 用户 ID (Firebase UID) 以启用静默同步功能。
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
                            onClick={closeUidPrompt}
                            disabled={isSavingUid}
                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleUidSubmit}
                            disabled={!uidInput.trim() || isSavingUid}
                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isSavingUid ? '保存中...' : '确认'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed z-[110] flex max-w-[calc(100vw-24px)] flex-wrap items-center justify-center gap-1 -translate-x-1/2 -translate-y-[130%] animate-bounce-in rounded-[26px] border border-white/20 bg-white/70 px-1 py-1 shadow-2xl backdrop-blur-xl transition-all dark:border-white/10 dark:bg-slate-900/70"
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
            {LINKAGE_TARGET_LIST.map((target) => {
                const status = statusByTarget[target.id];
                const isChecking = checkingTargetId === target.id;

                return (
                    <button
                        key={target.id}
                        onClick={(event) => handleTargetClick(target.id, event)}
                        disabled={isBusy || status !== 'idle'}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 ${status === 'success'
                            ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                            : status === 'error'
                                ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                                : 'hover:bg-white/50 dark:hover:bg-white/10'
                            }`}
                        title={`Send to ${target.label}`}
                    >
                        {status === 'sending' || isChecking ? (
                            <Loader2 size={13} className="animate-spin text-brand-500" />
                        ) : status === 'success' ? (
                            <Check size={13} />
                        ) : (
                            <img src={target.iconPath} alt={target.buttonLabel} className="w-4 h-4" />
                        )}
                        <span className={status === 'success' ? 'font-bold' : 'text-slate-700 dark:text-white'}>
                            {isChecking ? '检查中' : status === 'sending' ? '发送中' : status === 'success' ? '已添加' : status === 'error' ? '失败' : target.buttonLabel}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default ChatSelectionMenu;
