import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export default function ModernDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'info', // 'info', 'confirm', 'error', 'success'
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}) {
    if (!isOpen) return null;

    const icons = {
        info: <Info className="text-blue-500" size={24} />,
        confirm: <AlertCircle className="text-amber-500" size={24} />,
        error: <AlertCircle className="text-red-500" size={24} />,
        success: <CheckCircle2 className="text-emerald-500" size={24} />
    };

    const colors = {
        info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        confirm: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
        error: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
        success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
    };

    const buttonColors = {
        info: 'bg-blue-600 hover:bg-blue-500',
        confirm: 'bg-amber-600 hover:bg-amber-500',
        error: 'bg-red-600 hover:bg-red-500',
        success: 'bg-emerald-600 hover:bg-emerald-500'
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden animate-scale-in">
                <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                        <div className={`p-3 rounded-2xl ${colors[type]} shrink-0`}>
                            {icons[type]}
                        </div>
                        <div className="flex-grow pt-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 leading-tight">
                                {title}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        {type === 'confirm' ? (
                            <>
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`flex-1 px-4 py-3 text-white font-bold rounded-2xl transition-all shadow-lg ${buttonColors[type]}`}
                                >
                                    {confirmText}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                className={`w-full px-4 py-3 text-white font-bold rounded-2xl transition-all shadow-lg ${buttonColors[type]}`}
                            >
                                OK
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
